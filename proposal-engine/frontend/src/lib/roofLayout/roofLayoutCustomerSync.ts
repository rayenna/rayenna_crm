import type { CustomerRecord, RoofLayoutArtifact } from '../customerStore';
import { getActiveCustomer, getCustomer, upsertCustomer } from '../customerStore';
import { persistRoofLayoutPatch } from '../projectSaveRoofLayout';

/** Merge roof layout onto record; mirrors into proposal when embed is active. */
export function mergeRoofLayoutIntoCustomerRecord(
  record: CustomerRecord,
  roofLayout: RoofLayoutArtifact,
): CustomerRecord {
  return {
    ...record,
    updatedAt: new Date().toISOString(),
    roofLayout,
    proposal: record.proposal
      ? {
          ...record.proposal,
          roofLayout:
            record.proposal.roofLayout || record.proposal.includeRoofLayout
              ? {
                  ...(record.proposal.roofLayout ?? {
                    roof_area_m2: roofLayout.roof_area_m2,
                    usable_area_m2: roofLayout.usable_area_m2,
                    panel_count: roofLayout.panel_count,
                    layout_image_url: roofLayout.layout_image_url,
                  }),
                  roof_area_m2: roofLayout.roof_area_m2,
                  usable_area_m2: roofLayout.usable_area_m2,
                  panel_count: roofLayout.panel_count,
                  layout_image_url: roofLayout.layout_image_url,
                  ...(roofLayout.layout_image_3d_url != null
                    ? { layout_image_3d_url: roofLayout.layout_image_3d_url }
                    : {}),
                  ...(typeof roofLayout.prefer_3d_for_proposal === 'boolean'
                    ? { prefer_3d_for_proposal: roofLayout.prefer_3d_for_proposal }
                    : {}),
                }
              : record.proposal.roofLayout,
        }
      : record.proposal,
  };
}

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
  persistRoofLayoutPatch(ac.id, params);
}

export function clearRoofLayoutFromActiveCustomer() {
  const ac = getActiveCustomer();
  if (!ac?.id) return;
  const fresh = getCustomer(ac.id);
  if (!fresh) return;
  upsertCustomer({
    ...fresh,
    updatedAt: new Date().toISOString(),
    roofLayout: null,
    proposal: fresh.proposal ? { ...fresh.proposal, roofLayout: null } : fresh.proposal,
  });
}
