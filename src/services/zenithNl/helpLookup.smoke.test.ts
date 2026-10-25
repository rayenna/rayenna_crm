import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { UserRole } from '@prisma/client';
import { matchAskActionIntent } from './askActions';
import { matchExactChipIntent } from './chipIntents';
import {
  loadHelpCorpus,
  normalizeHelpText,
  searchHelpCorpus,
} from './helpCorpus';
import { execHelpLookup, matchHelpLookupIntent } from './helpLookupAsk';

function faqQuestionsFromDisk(): string[] {
  const root = path.join(process.cwd(), 'client/src/help/content/faq');
  const files = fs.readdirSync(root).filter((f) => f.endsWith('.md') && f !== 'index.md');
  const out: string[] = [];
  for (const file of files) {
    const md = fs.readFileSync(path.join(root, file), 'utf8');
    for (const line of md.split('\n')) {
      const m = /^###\s+(.+)$/.exec(line);
      if (!m) continue;
      const heading = m[1].replace(/[*_`]/g, '').trim();
      if (heading.length >= 6) out.push(heading);
    }
  }
  return out;
}

function moduleTopicQuestions(): string[] {
  const skip = new Set(
    [
      'choose a category',
      'full help sections',
      'choose your path',
      'by role where to go next',
      'power features (when you are ready)',
    ].map((s) => s.toLowerCase()),
  );
  const seen = new Set<string>();
  const out: string[] = [];
  for (const chunk of loadHelpCorpus()) {
    if (chunk.routeKey === 'faq') continue;
    const heading = chunk.heading.trim();
    if (heading.length < 10 || heading.length > 72) continue;
    if (skip.has(heading.toLowerCase())) continue;
    if (/^[a-z]/.test(heading) && heading.split(' ').length < 3) continue;
    const q = /\?$/.test(heading) ? heading : `What is ${heading}?`;
    const key = normalizeHelpText(q);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(q);
  }
  return out;
}

const PARAPHRASES: { q: string; mustMatch: RegExp }[] = [
  { q: 'Where do I add the Panel and Inverter brand in CRM?', mustMatch: /lifecycle|edit project|panel brand/ },
  { q: 'How do I login?', mustMatch: /email|password|log/ },
  { q: 'How can I change my password?', mustMatch: /change password|user menu/ },
  { q: 'Where is Tally Export?', mustMatch: /tally/ },
  { q: 'How do I open Proposal Engine?', mustMatch: /proposal/ },
  { q: 'What is Needs review?', mustMatch: /needs review|data sense|flag/ },
  { q: 'How do I use the command palette?', mustMatch: /ctrl|command palette|⌘/ },
  { q: 'What is Tip of the Day?', mustMatch: /tip/ },
  { q: 'Who can delete customers?', mustMatch: /admin|delete/ },
  { q: 'How do I create a support ticket?', mustMatch: /ticket/ },
];

const ANALYTICS_CONTROL = [
  'How many projects used Adani panels?',
  "What's my weighted pipeline?",
  'Who should I call today?',
  'Show open support tickets',
  'List pending subsidy projects',
  'Which panel brands sold most?',
];

function routedToHelp(q: string): boolean {
  return matchHelpLookupIntent(q, UserRole.ADMIN)?.metric === 'help_lookup';
}

describe('Ask Zenith Help smoke', () => {
  const faqs = faqQuestionsFromDisk();

  it('indexes every FAQ heading as a Help question', () => {
    expect(faqs.length).toBeGreaterThan(40);
  });

  it('routes every FAQ heading to help_lookup and retrieves that topic', () => {
    const misses: string[] = [];
    for (const q of faqs) {
      const action = matchAskActionIntent(q, UserRole.ADMIN);
      if (action) {
        misses.push(`ACTION ${q} → ${action.action}`);
        continue;
      }
      if (!routedToHelp(q)) {
        const chip = matchExactChipIntent(q, UserRole.ADMIN);
        misses.push(`ROUTE ${q} → chip=${chip?.metric ?? 'none'}`);
        continue;
      }
      const hits = searchHelpCorpus(q, 3);
      const nq = normalizeHelpText(q);
      if (!hits.some((h) => normalizeHelpText(h.heading) === nq)) {
        misses.push(`RANK ${q} → top=${hits[0]?.heading ?? '(none)'}`);
      }
    }
    expect(misses, misses.join('\n')).toEqual([]);
  });

  it('retrieves a Help hit for module/topic questions', () => {
    const qs = moduleTopicQuestions();
    expect(qs.length).toBeGreaterThan(40);
    const misses: string[] = [];
    for (const q of qs) {
      if (!routedToHelp(q)) {
        misses.push(`ROUTE ${q}`);
        continue;
      }
      const hits = searchHelpCorpus(q, 3);
      if (hits.length === 0) misses.push(`EMPTY ${q}`);
    }
    expect(misses, misses.join('\n')).toEqual([]);
  }, 20_000);

  it('does not steal analytics chips into Help', () => {
    for (const q of ANALYTICS_CONTROL) {
      expect(matchHelpLookupIntent(q, UserRole.ADMIN), q).toBeNull();
      const chip = matchExactChipIntent(q, UserRole.ADMIN);
      expect(chip?.metric, q).not.toBe('help_lookup');
    }
    expect(matchAskActionIntent('Open Help', UserRole.ADMIN)?.action).toBe('go_help');
    expect(matchAskActionIntent('Show Tip of the Day', UserRole.ADMIN)?.action).toBe('show_tip');
  });

  it('answers paraphrased Help questions from the matching article', async () => {
    for (const row of PARAPHRASES) {
      expect(routedToHelp(row.q), row.q).toBe(true);
      const out = await execHelpLookup(row.q);
      expect(out.insight.toLowerCase(), `${row.q} → ${out.insight}`).toMatch(row.mustMatch);
      expect(out.projectsHref).toMatch(/^\/help\//);
    }
  }, 60_000);
});
