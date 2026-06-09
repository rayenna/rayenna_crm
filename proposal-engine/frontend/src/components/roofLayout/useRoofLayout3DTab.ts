import { useEffect, useMemo } from 'react';
import type { AiRoofLayoutResponse } from '../../lib/apiClient';
import { absolutizeLayoutImageUrl } from '../../lib/roofLayout/roofLayoutPageUtils';

type Params = {
  roofViewTab: '2d' | '3d';
  setRoofViewTab: (tab: '2d' | '3d') => void;
  zoom: number;
  zoom3d: number;
  setZoom3d: (value: number | ((prev: number) => number)) => void;
  last3dPngDataUrl: string | null;
  result: AiRoofLayoutResponse | null;
  has3DRoofData: boolean;
  isNarrowViewport: boolean;
  layoutScrollViewport: { w: number; h: number };
};

export function useRoofLayout3DTab(params: Params) {
  const {
    roofViewTab,
    setRoofViewTab,
    zoom,
    zoom3d,
    setZoom3d,
    last3dPngDataUrl,
    result,
    has3DRoofData,
    isNarrowViewport,
    layoutScrollViewport,
  } = params;

  const narrow3dLive = isNarrowViewport && roofViewTab === '3d' && has3DRoofData;

  useEffect(() => {
    if (narrow3dLive) setZoom3d(1);
  }, [narrow3dLive, setZoom3d]);

  const saved3dDisplayUrl = useMemo(() => {
    const last = last3dPngDataUrl;
    if (last && last.startsWith('data:')) return last;
    return absolutizeLayoutImageUrl(last ?? result?.layout_image_3d_url);
  }, [last3dPngDataUrl, result?.layout_image_3d_url]);

  const canToggle2d3dPreview = has3DRoofData || !!saved3dDisplayUrl;

  const canChoose3dForProposal =
    has3DRoofData ||
    !!(last3dPngDataUrl && String(last3dPngDataUrl).trim()) ||
    !!(result?.layout_image_3d_url && String(result.layout_image_3d_url).trim());

  useEffect(() => {
    if (roofViewTab === '3d' && !has3DRoofData && !saved3dDisplayUrl) setRoofViewTab('2d');
  }, [has3DRoofData, roofViewTab, saved3dDisplayUrl, setRoofViewTab]);

  const layout3dBaseW = Math.max(layoutScrollViewport.w, 360);
  const layout3dBaseH = Math.max(layoutScrollViewport.h, 280);
  const layoutZoom3dActive = roofViewTab === '3d';
  const layoutZoomValue = layoutZoom3dActive ? zoom3d : zoom;
  const layoutZoomMin = layoutZoom3dActive ? 0.25 : 0.2;

  return {
    narrow3dLive,
    saved3dDisplayUrl,
    canToggle2d3dPreview,
    canChoose3dForProposal,
    layout3dBaseW,
    layout3dBaseH,
    layoutZoom3dActive,
    layoutZoomValue,
    layoutZoomMin,
  };
}
