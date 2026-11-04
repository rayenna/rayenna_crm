/**
 * @vitest-environment happy-dom
 */
import React, { useLayoutEffect, useRef } from 'react';
import { describe, expect, it } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';

/**
 * Mirrors useUncontrolledDocSection: while editing, React children are null and
 * text lives only in the DOM. A parent re-render must not snap text back.
 */
function Probe({ text, isEditing, bump }: { text: string; isEditing: boolean; bump: number }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const seededRef = useRef(false);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (isEditing) {
      if (!seededRef.current) {
        el.innerText = text;
        seededRef.current = true;
      }
      return;
    }
    seededRef.current = false;
  }, [isEditing, text]);
  return React.createElement(
    'p',
    {
      ref,
      'data-docx-section': 'about-p1',
      contentEditable: isEditing,
      'data-bump': String(bump),
    },
    isEditing ? null : text,
  );
}

describe('uncontrolled doc section edit model', () => {
  it('keeps typed DOM text across parent re-renders while editing', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);

    await act(async () => {
      root.render(React.createElement(Probe, { text: 'ORIGINAL', isEditing: true, bump: 0 }));
    });

    const el = host.querySelector('[data-docx-section="about-p1"]') as HTMLParagraphElement;
    expect(el).toBeTruthy();
    expect(el.innerText).toBe('ORIGINAL');

    // User types — mutate DOM only (what contentEditable does)
    el.innerText = 'ORIGINAL USER EDIT';

    // Parent re-render (BOM keystroke / Saving spinner) with SAME edit session
    await act(async () => {
      root.render(React.createElement(Probe, { text: 'ORIGINAL', isEditing: true, bump: 1 }));
    });

    const el2 = host.querySelector('[data-docx-section="about-p1"]') as HTMLParagraphElement;
    expect(el2.innerText).toBe('ORIGINAL USER EDIT');

    // Exit edit with saved overrides
    await act(async () => {
      root.render(
        React.createElement(Probe, {
          text: 'ORIGINAL USER EDIT',
          isEditing: false,
          bump: 2,
        }),
      );
    });
    const el3 = host.querySelector('[data-docx-section="about-p1"]') as HTMLParagraphElement;
    expect(el3.innerText).toBe('ORIGINAL USER EDIT');

    root.unmount();
    host.remove();
  });
});
