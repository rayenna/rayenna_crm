import { getActiveCustomer, getCustomer, upsertCustomer } from '../customerStore';

export function persistRoofLayoutToActiveCustomer(params: {
  roof_area_m2: number;
  usable_area_m2: number;
  panel_count: number;
  layout_image_url: string;
  layout_image_3d_url?: string;
  prefer_3d_for_proposal?: boolean;
  savedAt?: string;
}) {
  const ac = getActiveCustomer();
  if (!ac?.id) return;
  const fresh = getCustomer(ac.id);
  if (!fresh) return;
  const roofLayout = {
    savedAt: params.savedAt ?? new Date().toISOString(),
    roof_area_m2: Number(params.roof_area_m2),
    usable_area_m2: Number(params.usable_area_m2),
    panel_count: Number(params.panel_count),
    layout_image_url: String(params.layout_image_url),
    ...(params.layout_image_3d_url != null && String(params.layout_image_3d_url).trim()
      ? { layout_image_3d_url: String(params.layout_image_3d_url) }
      : {}),
    ...(typeof params.prefer_3d_for_proposal === 'boolean'
      ? { prefer_3d_for_proposal: params.prefer_3d_for_proposal }
      : {}),
  };
  upsertCustomer({
    ...fresh,
    roofLayout,
    proposal: fresh.proposal
      ? {
          ...fresh.proposal,
          roofLayout:
            fresh.proposal.roofLayout || fresh.proposal.includeRoofLayout
              ? {
                  ...(fresh.proposal.roofLayout ?? {
                    roof_area_m2: roofLayout.roof_area_m2,
                    usable_area_m2: roofLayout.usable_area_m2,
                    panel_count: roofLayout.panel_count,
                    layout_image_url: roofLayout.layout_image_url,
                  }),
                  ...roofLayout,
                }
              : fresh.proposal.roofLayout,
        }
      : fresh.proposal,
  });
}

export function clearRoofLayoutFromActiveCustomer() {
  const ac = getActiveCustomer();
  if (!ac?.id) return;
  const fresh = getCustomer(ac.id);
  if (!fresh) return;
  upsertCustomer({
    ...fresh,
    roofLayout: null,
    proposal: fresh.proposal ? { ...fresh.proposal, roofLayout: null } : fresh.proposal,
  });
}
