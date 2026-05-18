import { describe, expect, it } from 'vitest';
import { imageSupportsTextWrap } from './proposalEditorImage';

function mockImg(widthAttr: boolean): HTMLImageElement {
  return {
    hasAttribute: (name: string) => widthAttr && name === 'width',
  } as HTMLImageElement;
}

describe('proposalEditorImage', () => {
  it('full-width images do not support wrap', () => {
    expect(imageSupportsTextWrap(mockImg(false))).toBe(false);
    expect(imageSupportsTextWrap(mockImg(true))).toBe(true);
  });
});
