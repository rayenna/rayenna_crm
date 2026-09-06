import OpenAI from 'openai';
import prisma from '../prisma';
import { CONSUMER_SUPPORT_PHONE } from '../constants/consumerSupportContent';
import { getConsumerHelpArticle, getConsumerHelpPayload } from './consumerHelpService';
import { buildConsumerProjectStatus } from '../utils/consumerProjectStatus';
import {
  rankHelpChunks,
  type HelpRagChunk,
} from '../utils/consumerChatRag';
import {
  detectChatEscalate,
  EMERGENCY_CHAT_REPLY,
  type ChatEscalate,
} from '../utils/consumerChatSafety';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export function isConsumerSupportBotEnabled(): boolean {
  const flag = process.env.CONSUMER_SUPPORT_BOT?.trim().toLowerCase();
  if (flag === '0' || flag === 'false' || flag === 'off') return false;
  return true;
}

export type ConsumerChatReplyDto = {
  sessionId: string;
  reply: string;
  escalate: ChatEscalate | null;
  articleIds: string[];
};

function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#*_>`]/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

async function loadRagChunks(): Promise<Omit<HelpRagChunk, 'score'>[]> {
  const payload = await getConsumerHelpPayload();
  const chunks: Omit<HelpRagChunk, 'score'>[] = payload.faqs.map((faq) => ({
    id: `faq:${faq.id}`,
    title: faq.question,
    type: 'faq' as const,
    text: faq.answer,
    articleId: faq.articleId,
  }));

  for (const summary of payload.articles) {
    const article = await getConsumerHelpArticle(summary.id);
    const body = article ? stripMarkdown(article.markdown).slice(0, 2500) : summary.subtitle;
    chunks.push({
      id: `article:${summary.id}`,
      title: summary.title,
      type: 'article',
      text: `${summary.subtitle}. ${body}`,
      articleId: summary.id,
    });
  }

  return chunks;
}

async function retrieveHelpContext(message: string): Promise<HelpRagChunk[]> {
  const chunks = await loadRagChunks();
  return rankHelpChunks(message, chunks, 5);
}

function ragBlock(chunks: HelpRagChunk[]): string {
  if (chunks.length === 0) {
    return '(No matching Help Center passages.)';
  }
  return chunks
    .map((c, i) => `[${i + 1}] (${c.type}) ${c.title} [id:${c.articleId ?? c.id}]\n${c.text.slice(0, 900)}`)
    .join('\n\n');
}

function parseModelJson(raw: string): {
  reply: string;
  articleIds: string[];
  escalate: ChatEscalate | null;
} {
  try {
    const parsed = JSON.parse(raw) as {
      reply?: string;
      articleIds?: unknown;
      escalate?: string | null;
    };
    const escalate =
      parsed.escalate === 'emergency' ||
      parsed.escalate === 'whatsapp' ||
      parsed.escalate === 'ticket'
        ? parsed.escalate
        : null;
    const articleIds = Array.isArray(parsed.articleIds)
      ? parsed.articleIds.filter((id): id is string => typeof id === 'string').slice(0, 5)
      : [];
    return {
      reply: (parsed.reply || '').trim() || 'I can help with Hub, energy, warranty, and DISCOM questions.',
      articleIds,
      escalate,
    };
  } catch {
    const reply = raw.trim() || 'I can help with Hub, energy, warranty, and DISCOM questions.';
    return { reply, articleIds: [], escalate: null };
  }
}

function retrievalOnlyReply(chunks: HelpRagChunk[]): {
  reply: string;
  articleIds: string[];
  escalate: ChatEscalate | null;
} {
  const top = chunks[0];
  if (!top) {
    return {
      reply:
        'I do not have that in the Help Center. Use WhatsApp or Send a Query on the Support tab so the Rayenna team can help.',
      articleIds: [],
      escalate: 'whatsapp',
    };
  }
  return {
    reply: top.text.slice(0, 700),
    articleIds: top.articleId ? [top.articleId] : [],
    escalate: null,
  };
}

async function completeWithLlm(input: {
  message: string;
  chunks: HelpRagChunk[];
  history: { role: string; content: string }[];
  customerContext: string;
}): Promise<{ reply: string; articleIds: string[]; escalate: ChatEscalate | null }> {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    return retrievalOnlyReply(input.chunks);
  }

  const model = process.env.CONSUMER_CHAT_MODEL?.trim() || 'gpt-4o-mini';
  const completion = await openai.chat.completions.create({
    model,
    temperature: 0.2,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You are the Rayenna Solar Hub assistant for a Kerala homeowner. Answer only from HELP CONTEXT. If the context is insufficient, say so and set escalate to "whatsapp". Never invent prices, legal outcomes, or live generation numbers. Safety (smoke, burning smell, fire, sparks, shock, exposed wiring): set escalate to "emergency" and tell them to call ${CONSUMER_SUPPORT_PHONE} immediately. Do not give DIY electrical instructions for those cases. Customer context (may use for tone, not as facts beyond what is listed): ${input.customerContext}

Respond JSON: {"reply": string, "articleIds": string[], "escalate": null | "emergency" | "whatsapp" | "ticket"}
articleIds must be Help article ids from the context when you used them.`,
      },
      {
        role: 'user',
        content: `HELP CONTEXT:\n${ragBlock(input.chunks)}\n\nRECENT CHAT:\n${
          input.history
            .slice(-8)
            .map((m) => `${m.role}: ${m.content}`)
            .join('\n') || '(none)'
        }\n\nCUSTOMER MESSAGE:\n${input.message}`,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content || '{}';
  return parseModelJson(raw);
}

export async function replyConsumerChat(
  consumerUserId: string,
  input: { sessionId?: string; message: string },
): Promise<ConsumerChatReplyDto> {
  const message = input.message.trim();
  if (!message) {
    throw new Error('Message is required');
  }

  const consumer = await prisma.consumerUser.findUnique({
    where: { id: consumerUserId },
    include: {
      project: {
        select: {
          projectStage: true,
          projectStatus: true,
          systemCapacity: true,
        },
      },
    },
  });
  if (!consumer) throw new Error('Consumer not found');

  let sessionId = input.sessionId?.trim() || '';
  if (sessionId) {
    const existing = await prisma.consumerChatSession.findFirst({
      where: { id: sessionId, consumerUserId },
    });
    if (!existing) sessionId = '';
  }
  if (!sessionId) {
    const created = await prisma.consumerChatSession.create({
      data: { consumerUserId },
    });
    sessionId = created.id;
  }

  await prisma.consumerChatMessage.create({
    data: { sessionId, role: 'user', content: message },
  });

  const forced = detectChatEscalate(message);
  let reply: string;
  let escalate: ChatEscalate | null = forced;
  let articleIds: string[] = [];

  if (forced === 'emergency') {
    reply = EMERGENCY_CHAT_REPLY;
  } else if (forced === 'whatsapp') {
    reply =
      'A Rayenna teammate can continue this on WhatsApp. Use the button below — the 24/7 line is for emergencies only.';
  } else {
    const chunks = await retrieveHelpContext(message);
    const history = await prisma.consumerChatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      take: 12,
    });
    const status = buildConsumerProjectStatus(
      consumer.project.projectStage,
      consumer.project.projectStatus,
    );
    const customerContext = [
      consumer.firstName ? `Name: ${consumer.firstName}` : null,
      consumer.project.systemCapacity ? `System: ${consumer.project.systemCapacity} kW` : null,
      `Project: ${status.headline}`,
    ]
      .filter(Boolean)
      .join('; ');

    try {
      const llm = await completeWithLlm({
        message,
        chunks,
        history: history.map((m) => ({ role: m.role, content: m.content })),
        customerContext,
      });
      const allowed = new Set(chunks.map((c) => c.articleId).filter((id): id is string => Boolean(id)));
      reply = llm.reply;
      articleIds = llm.articleIds.filter((id) => allowed.has(id));
      escalate = llm.escalate;
      if (forced) escalate = forced;
    } catch (err) {
      console.error('Consumer chat LLM error:', err);
      const fallback = retrievalOnlyReply(chunks);
      reply = fallback.reply;
      articleIds = fallback.articleIds;
      escalate = fallback.escalate;
    }
  }

  await prisma.consumerChatMessage.create({
    data: {
      sessionId,
      role: 'assistant',
      content: reply,
      escalate,
      articleIds,
    },
  });
  await prisma.consumerChatSession.update({
    where: { id: sessionId },
    data: { updatedAt: new Date() },
  });

  return { sessionId, reply, escalate, articleIds };
}
