import fs from 'fs';
import path from 'path';

/** One Help heading plus the text under it. */
export type HelpChunk = {
  id: string;
  routeKey: string;
  title: string;
  heading: string;
  href: string;
  body: string;
  headingNorm: string;
  titleNorm: string;
  bodyNorm: string;
};

const HELP_ROUTE_KEYS = new Set([
  'getting-started',
  'modules',
  'dashboard',
  'zenith',
  'roles',
  'security',
  'faq',
  'training',
]);

const STOP = new Set([
  'the',
  'a',
  'an',
  'of',
  'to',
  'in',
  'for',
  'and',
  'or',
  'is',
  'are',
  'was',
  'be',
  'do',
  'i',
  'you',
  'we',
  'our',
  'my',
  'me',
  'on',
  'at',
  'from',
  'with',
  'this',
  'that',
  'it',
  'as',
  'by',
  'if',
  'can',
  'how',
  'where',
  'what',
  'when',
  'which',
  'does',
  'did',
  'any',
  'also',
  'into',
  'your',
  'crm',
  'dont',
]);

/** Fold phrasing so “log in” / “How do I login?” hit the same Help heading. */
export function normalizeHelpText(text: string): string {
  return text
    .toLowerCase()
    .replace(/['\u2019]/g, '')
    .replace(/\bcan not\b/g, 'cannot')
    .replace(/\bcant\b/g, 'cannot')
    .replace(/\bdo not\b/g, 'dont')
    .replace(/\bdont\b/g, 'dont')
    .replace(/\blog[\s-]?in\b/g, 'login')
    .replace(/\bsign[\s-]?in\b/g, 'login')
    .replace(/\bchange my password\b/g, 'change password')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

let cached: HelpChunk[] | null = null;
let headingIndex: Map<string, HelpChunk> | null = null;
let loggedEmpty = false;

/** Same slug rules as Help heading anchors (`client/src/help/markdownHeadingUtils.ts`). */
export function slugifyHelpHeading(text: string): string {
  const trimmed = text.trim();
  const apostropheNormalized = trimmed.replace(/['\u2019]/g, '');
  const leadingStripped =
    apostropheNormalized.replace(/^[^\p{L}\p{N}]+/u, '').trim() || apostropheNormalized;
  const slug = leadingStripped
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return slug || 'section';
}

export function helpSectionLabel(routeKey: string): string {
  const labels: Record<string, string> = {
    'getting-started': 'Getting started',
    modules: 'Modules',
    dashboard: 'Dashboard',
    zenith: 'Zenith',
    roles: 'Roles',
    security: 'Security',
    faq: 'FAQ',
    training: 'Training',
  };
  return labels[routeKey] || routeKey;
}

function uniqueExistingDirs(): string[] {
  const fromHere = path.resolve(__dirname, '../../..');
  const candidates = [
    path.join(process.cwd(), 'client/src/help/content'),
    path.join(fromHere, 'client/src/help/content'),
    path.join(process.cwd(), 'client/public/help-docs'),
    path.join(fromHere, 'client/public/help-docs'),
  ];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const dir of candidates) {
    const resolved = path.resolve(dir);
    if (seen.has(resolved)) continue;
    seen.add(resolved);
    try {
      if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) out.push(resolved);
    } catch {
      /* skip */
    }
  }
  // Prefer bundled markdown (`src/help/content`) over the public mirror when both exist.
  const content = out.filter((d) => d.replace(/\\/g, '/').includes('/help/content'));
  if (content.length > 0) return content.slice(0, 1);
  return out.slice(0, 1);
}

function walkMarkdownFiles(dir: string): string[] {
  const out: string[] = [];
  let entries: fs.Dirent[] = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walkMarkdownFiles(full));
    else if (ent.isFile() && ent.name.toLowerCase().endsWith('.md')) out.push(full);
  }
  return out;
}

function stripMarkdownNoise(text: string): string {
  return text
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*]\([^)]*\)/g, (m) => {
      const label = m.match(/^\[([^\]]*)]/)?.[1] ?? '';
      return label;
    })
    .replace(/[*_`>#]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function chunkMarkdown(md: string, routeKey: string, fileStem: string): HelpChunk[] {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const groups: { heading: string; lines: string[] }[] = [];
  let current = { heading: fileStem.replace(/-/g, ' '), lines: [] as string[] };
  for (const line of lines) {
    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      if (current.lines.some((l) => l.trim())) groups.push(current);
      current = {
        heading: heading[2].replace(/[*_`]/g, '').trim(),
        lines: [],
      };
    } else {
      current.lines.push(line);
    }
  }
  if (current.lines.some((l) => l.trim()) || groups.length === 0) groups.push(current);

  const pageTitle = groups[0]?.heading || fileStem;
  return groups
    .map((g, i) => {
      const body = stripMarkdownNoise(g.lines.join('\n')).slice(0, 4000);
      const hash = slugifyHelpHeading(g.heading);
      const headingNorm = normalizeHelpText(g.heading);
      const titleNorm = normalizeHelpText(pageTitle);
      const bodyNorm = normalizeHelpText(body);
      return {
        id: `${routeKey}:${fileStem}:${i}`,
        routeKey,
        title: pageTitle,
        heading: g.heading,
        href: `/help/${routeKey}#${hash}`,
        body,
        headingNorm,
        titleNorm,
        bodyNorm,
      };
    })
    .filter((c) => c.body.length >= 24 || c.heading.length >= 8);
}

function loadFromRoot(root: string): HelpChunk[] {
  const files = walkMarkdownFiles(root);
  const chunks: HelpChunk[] = [];
  for (const file of files) {
    const rel = path.relative(root, file).replace(/\\/g, '/');
    const routeKey = rel.split('/')[0];
    if (!routeKey || !HELP_ROUTE_KEYS.has(routeKey)) continue;
    let md = '';
    try {
      md = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    if (!md.trim()) continue;
    const fileStem = path.basename(file, '.md');
    chunks.push(...chunkMarkdown(md, routeKey, fileStem));
  }
  return chunks;
}

export function loadHelpCorpus(): HelpChunk[] {
  if (cached) return cached;
  const roots = uniqueExistingDirs();
  const chunks = roots.flatMap(loadFromRoot);
  cached = chunks;
  headingIndex = new Map();
  for (const chunk of chunks) {
    if (chunk.headingNorm && !headingIndex.has(chunk.headingNorm)) {
      headingIndex.set(chunk.headingNorm, chunk);
    }
  }
  if (chunks.length === 0 && !loggedEmpty) {
    loggedEmpty = true;
    console.warn('[zenith-nl-help] Help markdown not found beside the API process');
  }
  return chunks;
}

/** Test helper — next loadHelpCorpus() re-reads disk. */
export function resetHelpCorpusCacheForTests(): void {
  cached = null;
  headingIndex = null;
  loggedEmpty = false;
}

export function tokenizeHelpQuery(question: string): string[] {
  return normalizeHelpText(question)
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP.has(t));
}

function scoreChunk(questionNorm: string, tokens: string[], chunk: HelpChunk): number {
  const heading = chunk.headingNorm;
  const title = chunk.titleNorm;
  const body = chunk.bodyNorm;
  const hay = `${heading} ${title} ${body}`;
  let score = 0;
  if (questionNorm && heading === questionNorm) score += 100;
  else if (questionNorm && heading.startsWith(questionNorm) && questionNorm.length >= 12) score += 40;
  else if (questionNorm && heading.includes(questionNorm) && questionNorm.length >= 16) score += 24;
  if (tokens.length === 0) return score;
  for (const token of tokens) {
    if (heading.includes(token)) score += 6;
    else if (title.includes(token)) score += 3;
    else if (body.includes(token)) score += 1;
  }
  for (let i = 0; i < tokens.length - 1; i += 1) {
    const phrase = `${tokens[i]} ${tokens[i + 1]}`;
    if (heading.includes(phrase)) score += 5;
    else if (body.includes(phrase)) score += 4;
  }
  // Field names in Help are often "Panel Brand" even when the question is "panel and inverter brand".
  if (tokens.includes('panel') && tokens.includes('brand') && hay.includes('panel brand')) score += 10;
  if (tokens.includes('inverter') && tokens.includes('brand') && hay.includes('inverter brand')) {
    score += 10;
  }
  const wantsWhereToEnter =
    tokens.includes('add') || tokens.includes('enter') || tokens.includes('edit');
  if (wantsWhereToEnter) {
    if (/\b(edit.{0,20}project|project lifecycle|creating projects|status and lifecycle)\b/.test(hay)) {
      score += 14;
    }
    if (/\b(field|form)\b/.test(hay)) score += 4;
    if (/\b(charts?|explore the landscape|bar chart)\b/.test(hay)) score -= 16;
    if (tokens.includes('brand') && /\b(missing|gaps?|things needing attention)\b/.test(hay)) {
      score -= 14;
    }
    if (chunk.routeKey === 'modules' && /\bproject lifecycle\b/.test(hay)) score += 12;
  }
  if (chunk.routeKey === 'faq' && score > 0) score += 6;
  return score;
}

export function findExactHelpHeading(question: string): HelpChunk | undefined {
  loadHelpCorpus();
  const n = normalizeHelpText(question);
  if (!n || !headingIndex) return undefined;
  return headingIndex.get(n);
}

export function searchHelpCorpus(question: string, limit = 6): HelpChunk[] {
  const corpus = loadHelpCorpus();
  if (corpus.length === 0) return [];
  const questionNorm = normalizeHelpText(question);
  const tokens = tokenizeHelpQuery(question);
  if (tokens.length === 0 && !questionNorm) return [];
  const minScore = tokens.length >= 3 ? 5 : 3;
  const ranked = corpus
    .map((chunk) => ({ chunk, score: scoreChunk(questionNorm, tokens, chunk) }))
    .filter((row) => row.score >= minScore)
    .sort((a, b) => b.score - a.score);
  const seen = new Set<string>();
  const out: HelpChunk[] = [];
  for (const row of ranked) {
    if (seen.has(row.chunk.href)) continue;
    seen.add(row.chunk.href);
    out.push(row.chunk);
    if (out.length >= limit) break;
  }
  return out;
}
