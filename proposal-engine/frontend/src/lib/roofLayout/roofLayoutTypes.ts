import type { RefObject } from 'react';

/** Shared 2D roof layout geometry types (image pixel space). */

export type RoofLayoutPoint = { x: number; y: number };

export type RoofLayoutPanelRect = { x: number; y: number; w: number; h: number };

export type RoofLayoutKeepoutRect = { id: string; x: number; y: number; w: number; h: number };

/** Visual gap between adjacent module rects on the 2D canvas (px, image space). */
export const ROOF_LAYOUT_PANEL_VISUAL_INSET_PX = 0.85;

export type RoofLayoutCaptureRefs = {
  stageRef: RefObject<{ batchDraw?: () => void; toDataURL: (opts: object) => string } | null>;
  handlesLayerRef: RefObject<{ visible: (v: boolean) => void } | null>;
  polygonOutlineLayerRef: RefObject<{ visible: (v: boolean) => void } | null>;
  polygonDragLayerRef: RefObject<{ visible: (v: boolean) => void } | null>;
  keepoutLayerRef: RefObject<{ visible: (v: boolean) => void } | null>;
};
