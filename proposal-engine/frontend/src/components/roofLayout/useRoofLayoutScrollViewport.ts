import { useCallback, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import type { AiRoofLayoutResponse } from '../../lib/apiClient';
import {
  focalPointForEditingPolygon,
  focalPointForSavedView,
  scrollLayoutPreviewToFocal,
} from '../../lib/roofLayout/roofLayoutPageUtils';
import type { RoofLayoutPoint } from '../../lib/roofLayout/roofLayoutTypes';

type ScrollCenterMeta = { url: string; lastSig: string };

type MeasureRefs = {
  layoutScrollRef: RefObject<HTMLDivElement | null>;
  layoutPreviewMeasureRef: RefObject<HTMLDivElement | null>;
  layout3dCanvasMeasureRef: RefObject<HTMLDivElement | null>;
};

type ScrollCenterParams = MeasureRefs & {
  roofViewTab: '2d' | '3d';
  layoutMode: 'saved' | 'editing';
  has3DRoofData: boolean;
  imageSize: { width: number; height: number } | null;
  bgImage: HTMLImageElement | undefined;
  bgImageUrl: string | null;
  result: AiRoofLayoutResponse | null;
  polygon: RoofLayoutPoint[] | null;
  zoom: number;
  layoutScrollBufferPx: number;
};

export function useRoofLayoutScrollViewport(params: ScrollCenterParams) {
  const {
    roofViewTab,
    layoutMode,
    has3DRoofData,
    layoutScrollRef,
    layoutPreviewMeasureRef,
    layout3dCanvasMeasureRef,
    imageSize,
    bgImage,
    bgImageUrl,
    result,
    polygon,
    zoom,
    layoutScrollBufferPx,
  } = params;

  const [layoutScrollViewport, setLayoutScrollViewport] = useState({ w: 0, h: 0 });
  const scrollCenterMetaRef = useRef<ScrollCenterMeta>({ url: '', lastSig: '' });

  useLayoutEffect(() => {
    const el =
      roofViewTab === '3d' && has3DRoofData
        ? layoutScrollRef.current ?? layout3dCanvasMeasureRef.current
        : layoutPreviewMeasureRef.current;
    if (!el) return;

    let roRaf: number | null = null;
    const HYST_PX = 3;

    const apply = (w: number, h: number) => {
      if (w <= 0 || h <= 0) return;
      setLayoutScrollViewport((prev) => {
        if (Math.abs(prev.w - w) < HYST_PX && Math.abs(prev.h - h) < HYST_PX) return prev;
        return { w, h };
      });
    };

    apply(el.clientWidth, el.clientHeight);

    const schedule = () => {
      if (roRaf != null) return;
      roRaf = requestAnimationFrame(() => {
        roRaf = null;
        apply(el.clientWidth, el.clientHeight);
      });
    };

    const ro = new ResizeObserver(() => schedule());
    ro.observe(el);
    return () => {
      ro.disconnect();
      if (roRaf != null) cancelAnimationFrame(roRaf);
    };
  }, [
    roofViewTab,
    layoutMode,
    has3DRoofData,
    layoutScrollRef,
    layoutPreviewMeasureRef,
    layout3dCanvasMeasureRef,
  ]);

  useLayoutEffect(() => {
    if (!imageSize || !bgImage) return;

    if (roofViewTab !== '2d') {
      scrollCenterMetaRef.current.lastSig = '';
      return;
    }

    const urlKey = bgImageUrl ?? '';
    if (scrollCenterMetaRef.current.url !== urlKey) {
      scrollCenterMetaRef.current = { url: urlKey, lastSig: '' };
    }

    const vw = layoutScrollViewport.w;
    const vh = layoutScrollViewport.h;
    if (vw < 32 || vh < 32) return;

    if (layoutMode === 'saved') {
      const scrollSig = `saved|${zoom}|${Math.round(vw)}|${Math.round(vh)}`;
      if (scrollCenterMetaRef.current.lastSig === scrollSig) return;
      scrollCenterMetaRef.current.lastSig = scrollSig;
      const focal = focalPointForSavedView(imageSize, result);
      const run = () => {
        const el = layoutScrollRef.current;
        if (!el) return;
        scrollLayoutPreviewToFocal(el, focal.x, focal.y, zoom, layoutScrollBufferPx);
      };
      requestAnimationFrame(() => requestAnimationFrame(run));
      return;
    }

    if (layoutMode === 'editing' && polygon && polygon.length >= 2) {
      const scrollSig = `editing|${zoom}|${Math.round(vw)}|${Math.round(vh)}|${layoutScrollBufferPx}`;
      if (scrollCenterMetaRef.current.lastSig === scrollSig) return;
      scrollCenterMetaRef.current.lastSig = scrollSig;
      const focal = focalPointForEditingPolygon(imageSize, polygon);
      const run = () => {
        const el = layoutScrollRef.current;
        if (!el) return;
        scrollLayoutPreviewToFocal(el, focal.x, focal.y, zoom, layoutScrollBufferPx);
      };
      requestAnimationFrame(() => requestAnimationFrame(run));
    }
  }, [
    layoutMode,
    roofViewTab,
    imageSize,
    bgImage,
    bgImageUrl,
    result,
    polygon,
    zoom,
    layoutScrollViewport.w,
    layoutScrollViewport.h,
    layoutScrollBufferPx,
    layoutScrollRef,
  ]);

  const centerMapOnActiveRoof = useCallback(() => {
    const el = layoutScrollRef.current;
    if (!el || !imageSize) return;
    if (!polygon?.length) return;
    scrollCenterMetaRef.current.lastSig = '';
    const focal = focalPointForEditingPolygon(imageSize, polygon);
    scrollLayoutPreviewToFocal(el, focal.x, focal.y, zoom, layoutScrollBufferPx);
  }, [imageSize, polygon, zoom, layoutScrollBufferPx, layoutScrollRef]);

  const invalidateScrollCenterCache = useCallback(() => {
    scrollCenterMetaRef.current = { url: '', lastSig: '' };
  }, []);

  return { layoutScrollViewport, centerMapOnActiveRoof, invalidateScrollCenterCache };
}
