import { describe, expect, it } from 'vitest';
import { rankHelpChunks, tokenizeChatQuery } from './consumerChatRag';

describe('consumerChatRag', () => {
  it('tokenizes and drops stopwords', () => {
    expect(tokenizeChatQuery('How does net metering work for my bill?')).toEqual(
      expect.arrayContaining(['net', 'metering', 'work', 'bill']),
    );
  });

  it('ranks the matching help chunk first', () => {
    const ranked = rankHelpChunks('warranty claim inverter', [
      {
        id: 'a',
        title: 'KSEB net metering',
        type: 'article',
        text: 'Apply to DISCOM for a bi-directional meter.',
        articleId: 'kseb',
      },
      {
        id: 'b',
        title: 'Warranty guide',
        type: 'article',
        text: 'How to claim inverter warranty with Rayenna.',
        articleId: 'warranty-guide',
      },
    ]);
    expect(ranked[0]?.id).toBe('b');
  });
});
