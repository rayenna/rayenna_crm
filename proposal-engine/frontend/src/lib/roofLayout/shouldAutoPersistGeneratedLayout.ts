/**
 * After Generate/Re-Generate, wait until the Konva editor has a seeded polygon
 * and packed panels before auto-persisting to the server.
 */
export function shouldAutoPersistGeneratedLayout(params: {
  pending: boolean;
  loading: boolean;
  saving: boolean;
  layoutMode: 'saved' | 'editing';
  hasImageSize: boolean;
  polygonReady: boolean;
  panelCount: number;
}): boolean {
  return (
    params.pending &&
    !params.loading &&
    !params.saving &&
    params.layoutMode === 'editing' &&
    params.hasImageSize &&
    params.polygonReady &&
    params.panelCount > 0
  );
}
