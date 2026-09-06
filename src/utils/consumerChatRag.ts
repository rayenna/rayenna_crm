const STOP = new Set([
  'the',
  'and',
  'for',
  'you',
  'your',
  'are',
  'was',
  'with',
  'that',
  'this',
  'from',
  'have',
  'has',
  'not',
  'but',
  'how',
  'what',
  'when',
  'why',
  'can',
  'our',
  'any',
]);

export function tokenizeChatQuery(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && !STOP.has(t));
}

export type HelpRagChunk = {
  id: string;
  title: string;
  type: 'faq' | 'article';
  text: string;
  articleId: string | null;
  score: number;
};

export function scoreHelpChunk(queryTokens: string[], haystack: string): number {
  if (queryTokens.length === 0) return 0;
  const hay = haystack.toLowerCase();
  let score = 0;
  for (const token of queryTokens) {
    if (hay.includes(token)) score += 1;
  }
  return score;
}

export function rankHelpChunks(
  query: string,
  chunks: Omit<HelpRagChunk, 'score'>[],
  limit = 5,
): HelpRagChunk[] {
  const tokens = tokenizeChatQuery(query);
  return chunks
    .map((chunk) => ({
      ...chunk,
      score: scoreHelpChunk(tokens, `${chunk.title} ${chunk.text}`),
    }))
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
