import type { Dispatch, SetStateAction } from 'react';
import { saveRoofLayout3dImage, type AiRoofLayoutResponse } from '../api/roofLayout';
import { persistRoofLayoutToActiveCustomer } from './roofLayoutCustomerSync';
import { absolutizeLayoutImageUrl } from './roofLayoutPageUtils';

export type RoofLayout3dExportContext = {
  crmProjectId: string | undefined;
  result: AiRoofLayoutResponse | null;
  setLast3dPngDataUrl: (url: string | null) => void;
  setProposalImageSource: (source: '2d' | '3d') => void;
  setResult: Dispatch<SetStateAction<AiRoofLayoutResponse | null>>;
  setError: (message: string | null) => void;
};

/** Shared handler for live 3D PNG export (used by both narrow and desktop 3D shells). */
export async function handleRoofLayout3dExportPng(
  dataUrl: string,
  ctx: RoofLayout3dExportContext,
): Promise<void> {
  ctx.setLast3dPngDataUrl(dataUrl);
  ctx.setProposalImageSource('3d');
  const crmId = ctx.crmProjectId;
  if (!crmId || !dataUrl.startsWith('data:')) return;

  try {
    const out = await saveRoofLayout3dImage({
      projectId: String(crmId),
      dataUrl,
      setPreferForProposal: false,
      ...(Number.isFinite(Number(ctx.result?.roof_area_m2)) && {
        roof_area_m2: Number(ctx.result!.roof_area_m2),
      }),
      ...(Number.isFinite(Number(ctx.result?.usable_area_m2)) && {
        usable_area_m2: Number(ctx.result!.usable_area_m2),
      }),
      ...(Number.isFinite(Number(ctx.result?.panel_count)) && {
        panel_count: Number(ctx.result!.panel_count),
      }),
    });
    const abs = absolutizeLayoutImageUrl(out.layout_image_3d_url);
    if (abs) ctx.setLast3dPngDataUrl(abs);
    ctx.setResult((prev) => {
      if (!prev) return prev;
      const next = {
        ...prev,
        layout_image_3d_url: out.layout_image_3d_url,
        prefer_3d_for_proposal: out.prefer_3d_for_proposal,
      };
      persistRoofLayoutToActiveCustomer({
        roof_area_m2: next.roof_area_m2,
        usable_area_m2: next.usable_area_m2,
        panel_count: next.panel_count,
        layout_image_url: next.layout_image_url,
        layout_image_3d_url: out.layout_image_3d_url,
        prefer_3d_for_proposal: out.prefer_3d_for_proposal,
      });
      return next;
    });
  } catch (err) {
    ctx.setError(
      '3D image could not be saved to the server. It may not appear on other devices until saved.',
    );
    if (import.meta.env.DEV) console.error(err);
  }
}
