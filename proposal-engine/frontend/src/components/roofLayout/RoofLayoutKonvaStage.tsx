import { useMemo, type Dispatch, type LegacyRef, type MutableRefObject, type RefObject, type SetStateAction } from 'react';
import { Stage, Layer, Image as KonvaImage, Line, Rect, Circle, Text, Tag, Label } from 'react-konva';
import type Konva from 'konva';
import { ROOF_LAYOUT_METERS_PER_PIXEL } from '../../lib/roofLayoutConstants';
import type { RoofFacetState } from '../../lib/roofLayoutFacets';
import {
  closestPolygonEdge,
  edgeLengthLabelPosition,
  type PolygonEdgeInfo,
} from '../../lib/roofLayoutEdgeMeasure';
import { snapPolygonVertex } from '../../lib/roofLayout/polygonVertexSnap';
import { insetPolygonByDistance, setbackMetersToPixels } from '../../lib/roofLayout/polygonEdgeSetback';
import {
  ROOF_LAYOUT_PANEL_VISUAL_INSET_PX,
  isKeepoutCircle,
  type RoofLayoutKeepout,
  type RoofLayoutPanelRect,
  type RoofLayoutPoint,
} from '../../lib/roofLayout/roofLayoutTypes';

export type RoofLayoutKonvaStageRefs = {
  stageRef: RefObject<Konva.Stage | null>;
  lineRef: RefObject<Konva.Line | null>;
  handlesLayerRef: RefObject<Konva.Layer | null>;
  polygonOutlineLayerRef: RefObject<Konva.Layer | null>;
  polygonDragLayerRef: RefObject<Konva.Layer | null>;
  keepoutLayerRef: RefObject<Konva.Layer | null>;
  polygonMoveStartRef: MutableRefObject<{ x: number; y: number } | null>;
  polygonDragRef: MutableRefObject<{ x: number; y: number } | null>;
  polygonBaseRef: MutableRefObject<RoofLayoutPoint[] | null>;
  isDraggingRef: MutableRefObject<boolean>;
};

export type RoofLayoutKonvaStageProps = {
  imageSize: { width: number; height: number };
  bgImage: HTMLImageElement | undefined;
  satelliteOpacity: number;
  layoutMode: 'saved' | 'editing';
  facets: RoofFacetState[];
  activeFacetId: string;
  polygon: RoofLayoutPoint[] | null;
  panels: RoofLayoutPanelRect[];
  keepouts: RoofLayoutKeepout[];
  mapEditTool: 'scroll' | 'roof' | 'keepout';
  isDragging: boolean;
  hoveredEdge: PolygonEdgeInfo | null;
  canEditRoofPolygon: boolean;
  polygonStrokeWidth: number;
  controlPointRadius: number;
  controlPointHitStrokeWidth: number;
  edgeSetbackM?: number;
  refs: RoofLayoutKonvaStageRefs;
  onApplyPolygon: (next: RoofLayoutPoint[] | null) => void;
  onSetKeepouts: Dispatch<SetStateAction<RoofLayoutKeepout[]>>;
  onSetHoveredEdge: (edge: PolygonEdgeInfo | null) => void;
  onSetIsDragging: (dragging: boolean) => void;
};

export function RoofLayoutKonvaStage({
  imageSize,
  bgImage,
  satelliteOpacity,
  layoutMode,
  facets,
  activeFacetId,
  polygon,
  panels,
  keepouts,
  mapEditTool,
  isDragging,
  hoveredEdge,
  canEditRoofPolygon,
  polygonStrokeWidth,
  controlPointRadius,
  controlPointHitStrokeWidth,
  edgeSetbackM = 0,
  refs,
  onApplyPolygon,
  onSetKeepouts,
  onSetHoveredEdge,
  onSetIsDragging,
}: RoofLayoutKonvaStageProps) {
  const setbackInsetPolygon = useMemo(() => {
    if (!polygon || polygon.length < 3 || edgeSetbackM <= 0) return null;
    const insetPx = setbackMetersToPixels(edgeSetbackM, ROOF_LAYOUT_METERS_PER_PIXEL);
    if (insetPx <= 0) return null;
    return insetPolygonByDistance(polygon, insetPx);
  }, [polygon, edgeSetbackM]);

  const {
    stageRef,
    lineRef,
    handlesLayerRef,
    polygonOutlineLayerRef,
    polygonDragLayerRef,
    keepoutLayerRef,
    polygonMoveStartRef,
    polygonDragRef,
    polygonBaseRef,
    isDraggingRef,
  } = refs;

  return (
    <Stage
      ref={stageRef as LegacyRef<Konva.Stage>}
      width={imageSize.width}
      height={imageSize.height}
      onMouseMove={(e) => {
        if (layoutMode !== 'editing' || !polygon?.length) return;
        const pos = e.target.getStage()?.getPointerPosition();
        if (!pos) return;
        onSetHoveredEdge(closestPolygonEdge(polygon, ROOF_LAYOUT_METERS_PER_PIXEL, pos));
      }}
      onMouseLeave={() => onSetHoveredEdge(null)}
    >
      {/* Base image */}
      <Layer>
        <KonvaImage
          image={bgImage}
          width={imageSize.width}
          height={imageSize.height}
          opacity={satelliteOpacity}
        />
      </Layer>

      {/* Inactive roof sections (multi-facet). */}
      {layoutMode === 'editing' &&
        facets.map(
          (f) =>
            f.id !== activeFacetId &&
            f.polygon &&
            f.polygon.length >= 3 && (
              <Layer key={f.id} listening={false}>
                <Line
                  points={f.polygon.flatMap((p) => [p.x, p.y])}
                  closed
                  stroke="#64748b"
                  strokeWidth={polygonStrokeWidth}
                  dash={[10, 6]}
                  fill="rgba(100,116,139,0.06)"
                />
                {f.panels.map((rect, idx) => (
                  <Rect
                    key={`${f.id}-p-${idx}`}
                    x={rect.x + ROOF_LAYOUT_PANEL_VISUAL_INSET_PX}
                    y={rect.y + ROOF_LAYOUT_PANEL_VISUAL_INSET_PX}
                    width={Math.max(2, rect.w - ROOF_LAYOUT_PANEL_VISUAL_INSET_PX * 2)}
                    height={Math.max(2, rect.h - ROOF_LAYOUT_PANEL_VISUAL_INSET_PX * 2)}
                    fill="rgba(100,116,139,0.45)"
                    stroke="#94a3b8"
                    strokeWidth={1}
                    listening={false}
                  />
                ))}
              </Layer>
            ),
        )}

      {/* Active section outline (green). */}
      {layoutMode === 'editing' && polygon && (
        <Layer ref={polygonOutlineLayerRef as LegacyRef<Konva.Layer>}>
          <Line
            ref={lineRef as LegacyRef<Konva.Line>}
            points={polygon.flatMap((p) => [p.x, p.y])}
            closed
            stroke="#16a34a"
            strokeWidth={polygonStrokeWidth}
            fill="rgba(34,197,94,0.08)"
            listening={false}
          />
          {setbackInsetPolygon && setbackInsetPolygon.length >= 3 && (
            <Line
              points={setbackInsetPolygon.flatMap((p) => [p.x, p.y])}
              closed
              stroke="#d97706"
              strokeWidth={Math.max(1, polygonStrokeWidth * 0.85)}
              dash={[10, 8]}
              listening={false}
            />
          )}
        </Layer>
      )}

      {layoutMode === 'editing' && keepouts.length > 0 && (
        <Layer ref={keepoutLayerRef as LegacyRef<Konva.Layer>}>
          {keepouts.map((k) =>
            isKeepoutCircle(k) ? (
              <Circle
                key={k.id}
                x={k.cx}
                y={k.cy}
                radius={k.r}
                fill="rgba(249,115,22,0.35)"
                stroke="#ea580c"
                strokeWidth={1.5}
                draggable={mapEditTool === 'keepout'}
                onDragEnd={(e) => {
                  const node = e.target;
                  onSetKeepouts((prev) =>
                    prev.map((item) =>
                      item.id === k.id && isKeepoutCircle(item)
                        ? { ...item, cx: node.x(), cy: node.y() }
                        : item,
                    ),
                  );
                }}
              />
            ) : (
              <Rect
                key={k.id}
                x={k.x}
                y={k.y}
                width={k.w}
                height={k.h}
                fill="rgba(249,115,22,0.35)"
                stroke="#ea580c"
                strokeWidth={1.5}
                draggable={mapEditTool === 'keepout'}
                onDragEnd={(e) => {
                  const node = e.target;
                  onSetKeepouts((prev) =>
                    prev.map((item) =>
                      item.id === k.id && !isKeepoutCircle(item)
                        ? { ...item, x: node.x(), y: node.y() }
                        : item,
                    ),
                  );
                }}
              />
            ),
          )}
        </Layer>
      )}

      {layoutMode === 'editing' && polygon && panels.length > 0 && !isDragging && (
        <Layer
          listening={false}
          clipFunc={(ctx) => {
            if (!polygon.length) return;
            ctx.beginPath();
            polygon.forEach((p, idx) => {
              if (idx === 0) ctx.moveTo(p.x, p.y);
              else ctx.lineTo(p.x, p.y);
            });
            ctx.closePath();
          }}
        >
          {panels.map((rect, idx) => {
            const inset = ROOF_LAYOUT_PANEL_VISUAL_INSET_PX;
            return (
              <Rect
                key={idx}
                x={rect.x + inset}
                y={rect.y + inset}
                width={Math.max(2, rect.w - inset * 2)}
                height={Math.max(2, rect.h - inset * 2)}
                fill="rgba(14,30,95,0.92)"
                stroke="#c7d2e3"
                strokeWidth={1.15}
                cornerRadius={1}
                listening={false}
                perfectDrawEnabled={false}
                shadowEnabled={false}
              />
            );
          })}
        </Layer>
      )}

      {/* Invisible bbox above panels — Konva still hit-tests panel rects unless drag layer is on top. */}
      {canEditRoofPolygon && polygon && (
        <Layer ref={polygonDragLayerRef as LegacyRef<Konva.Layer>}>
          {(() => {
            let minX = polygon[0]!.x;
            let maxX = polygon[0]!.x;
            let minY = polygon[0]!.y;
            let maxY = polygon[0]!.y;
            for (const p of polygon) {
              if (p.x < minX) minX = p.x;
              if (p.x > maxX) maxX = p.x;
              if (p.y < minY) minY = p.y;
              if (p.y > maxY) maxY = p.y;
            }
            const w = Math.max(10, maxX - minX);
            const h = Math.max(10, maxY - minY);
            return (
              <Rect
                x={minX}
                y={minY}
                width={w}
                height={h}
                fill="rgba(22,163,74,0.03)"
                draggable
                strokeEnabled={false}
                onMouseEnter={() => {
                  document.body.style.cursor = 'move';
                }}
                onMouseLeave={() => {
                  document.body.style.cursor = 'default';
                }}
                onDragStart={(e) => {
                  polygonMoveStartRef.current = { x: e.target.x(), y: e.target.y() };
                  polygonBaseRef.current = polygon ? polygon.map((p) => ({ ...p })) : null;
                  polygonDragRef.current = { x: e.target.x(), y: e.target.y() };
                }}
                onDragMove={(e) => {
                  if (!polygonDragRef.current || !polygonBaseRef.current || !lineRef.current) return;
                  const start = polygonMoveStartRef.current;
                  const nx = e.target.x();
                  const ny = e.target.y();
                  const totalDist = start ? Math.abs(nx - start.x) + Math.abs(ny - start.y) : 0;
                  if (totalDist > 8 && !isDraggingRef.current) {
                    isDraggingRef.current = true;
                    onSetIsDragging(true);
                    document.body.style.cursor = 'grabbing';
                  }
                  if (!isDraggingRef.current) return;
                  const dragOrigin = polygonDragRef.current;
                  const dx = nx - dragOrigin.x;
                  const dy = ny - dragOrigin.y;
                  const flat = polygonBaseRef.current.flatMap((p) => [p.x + dx, p.y + dy]);
                  lineRef.current.points(flat);
                  lineRef.current.getLayer()?.batchDraw();
                }}
                onDragEnd={(e) => {
                  const start = polygonMoveStartRef.current;
                  const nx = e.target.x();
                  const ny = e.target.y();
                  const totalDist = start ? Math.abs(nx - start.x) + Math.abs(ny - start.y) : 0;
                  const didMove = totalDist > 8;

                  document.body.style.cursor = 'move';
                  polygonDragRef.current = null;
                  polygonMoveStartRef.current = null;
                  isDraggingRef.current = false;
                  onSetIsDragging(false);

                  if (didMove && lineRef.current) {
                    const flat = lineRef.current.points();
                    const next: RoofLayoutPoint[] = [];
                    for (let i = 0; i < flat.length; i += 2)
                      next.push({ x: flat[i]!, y: flat[i + 1]! });
                    onApplyPolygon(next.length ? next : null);
                  } else {
                    if (start) e.target.position({ x: start.x, y: start.y });
                    if (polygonBaseRef.current && lineRef.current) {
                      lineRef.current.points(
                        polygonBaseRef.current.flatMap((p) => [p.x, p.y]),
                      );
                      lineRef.current.getLayer()?.batchDraw();
                    }
                  }
                  polygonBaseRef.current = null;
                }}
              />
            );
          })()}
        </Layer>
      )}

      {/* Draggable polygon control-point circles (corner handles).
          Ref is attached so they can be hidden before toDataURL capture. */}
      {canEditRoofPolygon && polygon && (
        <Layer ref={handlesLayerRef as LegacyRef<Konva.Layer>}>
          {polygon.map((p, idx) => (
            <Circle
              key={idx}
              x={p.x}
              y={p.y}
              radius={controlPointRadius}
              fill="#10b981"
              stroke="#047857"
              strokeWidth={1.5}
              hitStrokeWidth={controlPointHitStrokeWidth}
              draggable
              onDragStart={() => {
                isDraggingRef.current = true;
                onSetIsDragging(true);
              }}
              onDragMove={(e) => {
                if (!lineRef.current || !polygon) return;
                const snapped = snapPolygonVertex(polygon, idx, e.target.x(), e.target.y());
                e.target.position({ x: snapped.x, y: snapped.y });
                const flat = polygon.flatMap((pt, i) =>
                  i === idx ? [snapped.x, snapped.y] : [pt.x, pt.y],
                );
                lineRef.current.points(flat);
                lineRef.current.getLayer()?.batchDraw();
              }}
              onDragEnd={(e) => {
                isDraggingRef.current = false;
                onSetIsDragging(false);
                if (lineRef.current && polygon) {
                  const snapped = snapPolygonVertex(polygon, idx, e.target.x(), e.target.y());
                  e.target.position({ x: snapped.x, y: snapped.y });
                  const flat = polygon.flatMap((pt, i) =>
                    i === idx ? [snapped.x, snapped.y] : [pt.x, pt.y],
                  );
                  lineRef.current.points(flat);
                  const next: RoofLayoutPoint[] = [];
                  for (let i = 0; i < flat.length; i += 2)
                    next.push({ x: flat[i]!, y: flat[i + 1]! });
                  onApplyPolygon(next.length ? next : null);
                }
              }}
            />
          ))}
        </Layer>
      )}

      {/* Edge length callout — above corner handles so green circles do not clip it. */}
      {layoutMode === 'editing' &&
        hoveredEdge &&
        polygon &&
        !isDragging &&
        (() => {
          const anchor = edgeLengthLabelPosition(
            polygon,
            hoveredEdge,
            controlPointRadius + 22,
          );
          const labelText = `${hoveredEdge.lengthM.toFixed(1)} m`;
          return (
            <Layer listening={false}>
              <Label x={anchor.x} y={anchor.y} offsetX={28} offsetY={12}>
                <Tag
                  fill="rgba(15,23,42,0.92)"
                  cornerRadius={6}
                  pointerDirection="down"
                  pointerWidth={8}
                  pointerHeight={6}
                  lineJoin="round"
                  shadowColor="rgba(0,0,0,0.35)"
                  shadowBlur={6}
                  shadowOffsetY={2}
                  shadowOpacity={0.8}
                />
                <Text
                  text={labelText}
                  fill="#ffffff"
                  fontSize={12}
                  fontStyle="bold"
                  padding={6}
                />
              </Label>
            </Layer>
          );
        })()}

      {/* Scale bar — bottom-right corner of the canvas.
          Renders in all modes (saved + editing) so the saved proposal image includes it. */}
      {imageSize &&
        (() => {
          const scaleBarM = 20; // show a 20-metre reference bar
          const scaleBarPx = scaleBarM / ROOF_LAYOUT_METERS_PER_PIXEL;
          const margin = 16;
          const barY = imageSize.height - margin - 4;
          const barX = imageSize.width - margin - scaleBarPx;
          const textY = barY - 16;
          return (
            <Layer listening={false}>
              {/* White shadow for contrast on any background */}
              <Line
                points={[barX, barY, barX + scaleBarPx, barY]}
                stroke="white"
                strokeWidth={5}
                lineCap="round"
              />
              <Line
                points={[barX, barY, barX + scaleBarPx, barY]}
                stroke="#1e293b"
                strokeWidth={2.5}
                lineCap="round"
              />
              {/* Tick marks at each end */}
              <Line points={[barX, barY - 5, barX, barY + 5]} stroke="white" strokeWidth={4} />
              <Line points={[barX, barY - 5, barX, barY + 5]} stroke="#1e293b" strokeWidth={2} />
              <Line
                points={[barX + scaleBarPx, barY - 5, barX + scaleBarPx, barY + 5]}
                stroke="white"
                strokeWidth={4}
              />
              <Line
                points={[barX + scaleBarPx, barY - 5, barX + scaleBarPx, barY + 5]}
                stroke="#1e293b"
                strokeWidth={2}
              />
              {/* Label */}
              <Text
                x={barX}
                y={textY}
                width={scaleBarPx}
                text={`${scaleBarM} m`}
                align="center"
                fontSize={13}
                fontStyle="bold"
                fill="white"
                shadowColor="#0f172a"
                shadowBlur={3}
                shadowOffsetX={0}
                shadowOffsetY={1}
              />
            </Layer>
          );
        })()}
    </Stage>
  );
}
