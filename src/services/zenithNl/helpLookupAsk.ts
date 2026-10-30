import Anthropic from '@anthropic-ai/sdk';
import { UserRole } from '@prisma/client';
import { metricAllowedForRole, type ZenithNlIntent, type ZenithNlViz } from './catalog';
import {
  findExactHelpHeading,
  helpSectionLabel,
  searchHelpCorpus,
  type HelpChunk,
} from './helpCorpus';

function createAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim() || '';
  const workspaceId = process.env.ANTHROPIC_WORKSPACE_ID?.trim() || '';
  return new Anthropic({
    apiKey,
    ...(workspaceId ? { defaultHeaders: { 'anthropic-workspace-id': workspaceId } } : {}),
  });
}

function compactQuestion(question: string): string {
  return question.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** How-to / FAQ / troubleshooting phrasing — not “open this screen now”. */
export function looksLikeHelpQuestion(question: string): boolean {
  const q = compactQuestion(question);
  if (!q) return false;
  if (/^(open\s+)?help$/.test(q) || /^go\s+to\s+help$/.test(q)) return false;
  if (/^(show\s+)?tip of the day$/.test(q) || /^show\s+tip$/.test(q)) return false;
  return (
    /^(how|what|where|why|when|does)\b/.test(q) ||
    /^who\s+can\b/.test(q) ||
    /^(can|do|does|is|are)\s+i\b/.test(q) ||
    /^can\s+i\b/.test(q) ||
    /^why\s+can'?t\b/.test(q) ||
    /^i\s+can'?t\b/.test(q) ||
    /\b(how\s+(do|can|should|to)|where\s+(do|can|should|is|are|to)|what\s+(is|are|does)|who\s+can|when\s+(do|does))\b/.test(
      q,
    ) ||
    /\bin\s+(the\s+)?(help|crm|app)\b/.test(q) ||
    /\b(not\s+loading|not\s+working|not\s+updating|looks\s+wrong|export\s+not\s+working|cannot\s+log|can't\s+log|can't\s+see|won'?t\s+load|don'?t\s+match)\b/.test(
      q,
    ) ||
    /^(the page is|data is not|zenith shows|help content)\b/.test(q)
  );
}

function isAnalyticsQuestion(q: string): boolean {
  return /\b(how\s+many|how\s+much|who\s+should\s+i\s+call|pipeline\s+stall|weighted\s+pipeline|revenue\s+by|profit\s+summary|unpaid\s+invoices|capacity\s+sold|list\s+(the\s+)?(lost\s+)?(deals?|projects?)|show\s+(me\s+)?(my\s+)?(open|ageing|aging|pipeline|stalled)|which\s+(lead\s+sources|panel\s+brands?|inverter\s+brands?|banks)\s+(sold|drove|are|financing)|sales\s+review\s+(achievement|forecast|kpis?)|funnel\s+velocity\s+(sla|win|median)|delivery\s+control\s+(blocker|kpi)|collections\s+outstanding|thin\s+margin|missing\s+cost|sla\s+red)\b/.test(
    q,
  );
}

function helpIntent(): ZenithNlIntent {
  return {
    metric: 'help_lookup',
    viz: 'table',
    insightHints: 'crm help',
  };
}

/** How-to / where-is / what-does questions that should read Help instead of CRM numbers. */
export function matchHelpLookupIntent(
  question: string,
  role: UserRole,
): ZenithNlIntent | null {
  if (!metricAllowedForRole('help_lookup', role)) return null;
  const q = compactQuestion(question);
  if (!q) return null;
  if (/^(open\s+)?help$/.test(q) || /^go\s+to\s+help$/.test(q) || /^show\s+tip$/.test(q)) {
    return null;
  }
  if (isAnalyticsQuestion(q)) return null;
  if (findExactHelpHeading(question)) return helpIntent();
  if (looksLikeHelpQuestion(q)) return helpIntent();
  const hits = searchHelpCorpus(question, 1);
  if (hits.length > 0 && /\?/.test(question)) return helpIntent();
  return null;
}

function snippetInsight(hits: HelpChunk[]): string {
  const top = hits[0];
  if (!top) {
    return `I could not find that in Help. Open Help from the ? menu and search, or try a shorter phrase.`;
  }
  const excerpt = top.body.slice(0, 420).trim();
  const section = `${helpSectionLabel(top.routeKey)} → ${top.heading}`;
  if (!excerpt) {
    return `Help covers this under ${section}. Open the topic below for the full steps.`;
  }
  return `From Help (${section}): ${excerpt}${top.body.length > 420 ? '…' : ''}`;
}

async function synthesizeHelpAnswer(question: string, hits: HelpChunk[]): Promise<string | null> {
  if (!process.env.ANTHROPIC_API_KEY?.trim()) return null;
  const excerpts = hits
    .slice(0, 5)
    .map(
      (h, i) =>
        `[${i + 1}] ${helpSectionLabel(h.routeKey)} — ${h.heading} (${h.href})\n${h.body.slice(0, 1400)}`,
    )
    .join('\n\n');
  const model = process.env.ZENITH_NL_MODEL?.trim() || 'claude-haiku-4-5-20251001';
  const anthropic = createAnthropicClient();
  try {
    const message = await anthropic.messages.create({
      model,
      max_tokens: 360,
      temperature: 0,
      system: `You answer Rayenna CRM how-to questions using ONLY the Help excerpts. Write 2–5 short sentences. Name the screen, menu, or field from the excerpts. If the excerpts do not contain the answer, say you could not find it in Help. Do not invent screens, buttons, or numbers. Do not mention that you are a language model.`,
      messages: [
        {
          role: 'user',
          content: `Question: ${question}\n\nHelp excerpts:\n${excerpts}`,
        },
      ],
    });
    const text = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('\n')
      .trim();
    return text || null;
  } catch (err) {
    console.warn('[zenith-nl-help] synthesize failed', err instanceof Error ? err.message : err);
    return null;
  }
}

function helpTable(hits: HelpChunk[]): ZenithNlViz {
  const rows =
    hits.length > 0
      ? hits.map((h) => ({
          topic: h.heading,
          section: helpSectionLabel(h.routeKey),
          href: h.href,
        }))
      : [{ topic: 'Open Help', section: 'Help', href: '/help' }];
  return {
    kind: 'table',
    title: 'Help topics',
    columns: [
      { key: 'topic', label: 'Topic' },
      { key: 'section', label: 'Section' },
    ],
    rows,
  };
}

function pinExactHeading(question: string, hits: HelpChunk[]): HelpChunk[] {
  const exact = findExactHelpHeading(question);
  if (!exact) return hits;
  return [exact, ...hits.filter((h) => h.id !== exact.id)].slice(0, 6);
}

export async function execHelpLookup(question: string): Promise<{
  insight: string;
  viz: ZenithNlViz;
  projectsHref?: string;
}> {
  const hits = pinExactHeading(question, searchHelpCorpus(question, 6));
  if (hits.length === 0) {
    return {
      insight:
        'I could not find that in Help. Open Help from the ? menu and use Search help, or try naming the screen or field.',
      viz: helpTable([]),
      projectsHref: '/help',
    };
  }
  const synthesized = await synthesizeHelpAnswer(question, hits);
  return {
    insight: synthesized || snippetInsight(hits),
    viz: helpTable(hits),
    projectsHref: hits[0]?.href || '/help',
  };
}
