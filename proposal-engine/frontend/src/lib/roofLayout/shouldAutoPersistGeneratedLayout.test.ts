import { describe, expect, it } from 'vitest';
import { shouldAutoPersistGeneratedLayout } from './shouldAutoPersistGeneratedLayout';

describe('shouldAutoPersistGeneratedLayout', () => {
  const ready = {
    pending: true,
    loading: false,
    saving: false,
    layoutMode: 'editing' as const,
    hasImageSize: true,
    polygonReady: true,
    panelCount: 12,
  };

  it('allows persist when editor is ready after generate', () => {
    expect(shouldAutoPersistGeneratedLayout(ready)).toBe(true);
  });

  it('blocks while loading, saving, or still pending panels', () => {
    expect(shouldAutoPersistGeneratedLayout({ ...ready, pending: false })).toBe(false);
    expect(shouldAutoPersistGeneratedLayout({ ...ready, loading: true })).toBe(false);
    expect(shouldAutoPersistGeneratedLayout({ ...ready, saving: true })).toBe(false);
    expect(shouldAutoPersistGeneratedLayout({ ...ready, layoutMode: 'saved' })).toBe(false);
    expect(shouldAutoPersistGeneratedLayout({ ...ready, panelCount: 0 })).toBe(false);
    expect(shouldAutoPersistGeneratedLayout({ ...ready, polygonReady: false })).toBe(false);
  });
});
