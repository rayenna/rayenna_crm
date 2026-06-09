import { Suspense, lazy, type MutableRefObject, type Ref, type RefObject } from 'react';
import { ROOF_LAYOUT_METERS_PER_PIXEL } from '../../lib/roofLayoutConstants';
import type { RoofLayoutPoint } from '../../lib/roofLayout/roofLayoutTypes';
import type { Solar3DOrbitSnapshot, Solar3DViewHandle } from '../Solar3DView';

const LazySolar3DView = lazy(() => import('../Solar3DView'));

type PanelRect = { x: number; y: number; w: number; h: number };

type Props = {
  narrow3dLive: boolean;
  layoutScrollRef: RefObject<HTMLDivElement | null>;
  layout3dCanvasMeasureRef: RefObject<HTMLDivElement | null>;
  setSolar3dControlsHost: (el: HTMLDivElement | null) => void;
  solar3dControlsHost: HTMLDivElement | null;
  layout3dBaseW: number;
  layout3dBaseH: number;
  zoom3d: number;
  solar3dRef: RefObject<Solar3DViewHandle | null>;
  solar3dOrbitRef: RefObject<Solar3DOrbitSnapshot | null>;
  solar3dPersistentLayoutKeyRef: MutableRefObject<string>;
  polygon: RoofLayoutPoint[];
  allPanelsFlat: PanelRect[];
  imageSize: { width: number; height: number };
  bgImageUrl: string | null;
  panelCount?: number;
  last3dPngDataUrl: string | null;
  onExportPNG: (dataUrl: string) => void | Promise<void>;
  /** Portrait module footprint (m) from CRM SKU resolution — visual parity with 2D packing. */
  portraitModuleSizeM?: { widthM: number; heightM: number };
};

export function RoofLayout3DPreviewShell({
  narrow3dLive,
  layoutScrollRef,
  layout3dCanvasMeasureRef,
  setSolar3dControlsHost,
  solar3dControlsHost,
  layout3dBaseW,
  layout3dBaseH,
  zoom3d,
  solar3dRef,
  solar3dOrbitRef,
  solar3dPersistentLayoutKeyRef,
  polygon,
  allPanelsFlat,
  imageSize,
  bgImageUrl,
  panelCount,
  last3dPngDataUrl,
  onExportPNG,
  portraitModuleSizeM,
}: Props) {
  const panelCoordinates = allPanelsFlat.map((p) => ({
    x: p.x,
    y: p.y,
    width: p.w,
    height: p.h,
  }));

  const solar3dCommonProps = {
    orbitStateRef: solar3dOrbitRef,
    persistentLayoutKeyRef: solar3dPersistentLayoutKeyRef,
    fillParent: true as const,
    roofPolygon: polygon,
    panelCoordinates,
    imageSize,
    roofImageUrl: bgImageUrl ?? undefined,
    metersPerPixel: ROOF_LAYOUT_METERS_PER_PIXEL,
    panelCount,
    onExportPNG,
    portraitModuleSizeM,
  };

  return (
    <div
      className={`flex flex-1 min-h-0 min-w-0 gap-2 sm:gap-3 p-0 sm:p-2 lg:p-3 ${
        narrow3dLive ? 'flex-col lg:flex-row' : 'flex-col'
      }`}
    >
      {narrow3dLive && (
        <div
          ref={setSolar3dControlsHost}
          className="w-full lg:w-[min(18rem,100%)] xl:w-80 shrink-0 order-2 lg:order-1 max-h-[min(44vh,22rem)] sm:max-h-[min(48vh,24rem)] lg:max-h-none overflow-y-auto overflow-x-hidden min-h-0"
          aria-label="3D scene controls"
        />
      )}
      <div
        ref={layout3dCanvasMeasureRef as Ref<HTMLDivElement>}
        className={`w-full min-h-0 min-w-0 flex flex-col overflow-hidden flex-1 ${
          narrow3dLive ? 'order-1 lg:order-2' : ''
        }`}
      >
        <div
          ref={layoutScrollRef as Ref<HTMLDivElement>}
          className={`w-full flex-1 min-h-0 min-w-0 overscroll-contain bg-slate-200 ${
            narrow3dLive
              ? 'overflow-y-auto overflow-x-hidden'
              : 'layout-preview-scroll-3d overflow-x-scroll overflow-y-scroll'
          }`}
          style={{
            WebkitOverflowScrolling: 'touch',
            ...(narrow3dLive ? {} : { touchAction: 'pan-x pan-y' as const }),
          }}
        >
          {narrow3dLive ? (
            <div className="flex flex-col w-full min-w-0 items-stretch">
              <div
                className="w-full shrink-0 bg-slate-200"
                style={{
                  height: 'min(56vh, 480px)',
                  minHeight: 220,
                }}
              >
                <Suspense
                  fallback={
                    <div className="w-full h-full min-h-[220px] flex items-center justify-center text-gray-500 text-sm bg-slate-200">
                      Loading 3D…
                    </div>
                  }
                >
                  <LazySolar3DView
                    {...solar3dCommonProps}
                    ref={solar3dRef as Ref<Solar3DViewHandle>}
                    controlsPortalHost={solar3dControlsHost}
                    resolutionScale={1}
                  />
                </Suspense>
              </div>
              {last3dPngDataUrl && (
                <div className="mt-2 px-1 pb-2 shrink-0">
                  <div className="text-xs font-medium text-gray-600 mb-1">3D Render (last exported)</div>
                  <img
                    src={last3dPngDataUrl}
                    alt="3D render preview"
                    className="w-full rounded-lg border border-gray-200 bg-white"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="min-w-full min-h-full flex justify-center items-start bg-slate-200">
              <div
                className="inline-block align-top box-border bg-slate-200"
                style={{
                  width: layout3dBaseW * zoom3d,
                  minHeight: layout3dBaseH * zoom3d,
                }}
              >
                <Suspense
                  fallback={
                    <div
                      className="flex items-center justify-center text-gray-500 text-sm bg-slate-200"
                      style={{
                        width: layout3dBaseW * zoom3d,
                        height: layout3dBaseH * zoom3d,
                      }}
                    >
                      Loading 3D...
                    </div>
                  }
                >
                  <div
                    className="bg-slate-200"
                    style={{
                      width: layout3dBaseW * zoom3d,
                      height: layout3dBaseH * zoom3d,
                    }}
                  >
                    <LazySolar3DView
                      {...solar3dCommonProps}
                      ref={solar3dRef as Ref<Solar3DViewHandle>}
                      controlsPortalHost={narrow3dLive ? solar3dControlsHost : null}
                    />
                  </div>
                </Suspense>
                {last3dPngDataUrl && (
                  <div className="mt-3 px-2 pb-2">
                    <div className="text-xs font-medium text-gray-600 mb-2">3D Render (last exported)</div>
                    <img
                      src={last3dPngDataUrl}
                      alt="3D render preview"
                      className="w-full rounded-lg border border-gray-200 bg-white"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
