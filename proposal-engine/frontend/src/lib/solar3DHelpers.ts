import * as THREE from 'three';

export type Solar3DRoofPolygonPoint = { x: number; y: number };
export type Solar3DPanel = { x: number; y: number; width: number; height: number; rotation?: number };

/**
 * High-res procedural “glass + cells” albedo for panel tops.
 * Reads as photovoltaic glass (busbars, cell grid, AR tint) rather than flat blue paint.
 */
export function createSolarPanelTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 480;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    const fallback = new THREE.CanvasTexture(canvas);
    return fallback;
  }

  const w = canvas.width;
  const h = canvas.height;
  const pad = 10;
  const cols = 6;
  const rows = 4;

  // Deep blue-black silicon base
  const baseGrad = ctx.createLinearGradient(0, 0, w, h);
  baseGrad.addColorStop(0, '#0c1f38');
  baseGrad.addColorStop(0.5, '#0a1830');
  baseGrad.addColorStop(1, '#081428');
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, w, h);

  const innerW = w - pad * 2;
  const innerH = h - pad * 2;
  const cellW = innerW / cols;
  const cellH = innerH / rows;

  // Per-cell variation (slight mottling like real modules)
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const x = pad + c * cellW;
      const y = pad + r * cellH;
      const n = ((c * 17 + r * 31) % 10) / 200;
      ctx.fillStyle = `rgba(25, 70, 120, ${0.12 + n})`;
      ctx.fillRect(x + 1, y + 1, cellW - 2, cellH - 2);
    }
  }

  // Vertical cell dividers (thin)
  ctx.strokeStyle = 'rgba(15, 45, 85, 0.85)';
  ctx.lineWidth = 1.25;
  for (let c = 1; c < cols; c++) {
    const x = pad + c * cellW;
    ctx.beginPath();
    ctx.moveTo(x, pad);
    ctx.lineTo(x, h - pad);
    ctx.stroke();
  }
  // Horizontal busbars (typical 3–4 per module)
  ctx.strokeStyle = 'rgba(180, 195, 210, 0.55)';
  ctx.lineWidth = 1.1;
  const busCount = 3;
  for (let b = 1; b <= busCount; b++) {
    const y = pad + (innerH * b) / (busCount + 1);
    ctx.beginPath();
    ctx.moveTo(pad, y);
    ctx.lineTo(w - pad, y);
    ctx.stroke();
  }
  // Horizontal cell rows
  ctx.strokeStyle = 'rgba(20, 55, 95, 0.75)';
  ctx.lineWidth = 1;
  for (let r = 1; r < rows; r++) {
    const y = pad + r * cellH;
    ctx.beginPath();
    ctx.moveTo(pad, y);
    ctx.lineTo(w - pad, y);
    ctx.stroke();
  }

  // Glass reflection streak (diagonal soft highlight)
  const gloss = ctx.createLinearGradient(0, 0, w * 0.9, h * 0.7);
  gloss.addColorStop(0, 'rgba(255, 255, 255, 0)');
  gloss.addColorStop(0.45, 'rgba(200, 220, 255, 0.14)');
  gloss.addColorStop(0.55, 'rgba(200, 220, 255, 0.08)');
  gloss.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = gloss;
  ctx.fillRect(pad, pad, innerW, innerH);

  // Subtle secondary cell grid (finer) — reads as silicon wafer subdivisions, not heavy lines.
  ctx.strokeStyle = 'rgba(200, 215, 235, 0.06)';
  ctx.lineWidth = 0.75;
  const fineCols = 12;
  const fineRows = 8;
  for (let c = 1; c < fineCols; c++) {
    const x = pad + (c / fineCols) * innerW;
    ctx.beginPath();
    ctx.moveTo(x, pad);
    ctx.lineTo(x, h - pad);
    ctx.stroke();
  }
  for (let r = 1; r < fineRows; r++) {
    const y = pad + (r / fineRows) * innerH;
    ctx.beginPath();
    ctx.moveTo(pad, y);
    ctx.lineTo(w - pad, y);
    ctx.stroke();
  }

  // Aluminium frame (outer + inner lip)
  ctx.strokeStyle = '#4a4f56';
  ctx.lineWidth = 5;
  ctx.strokeRect(3, 3, w - 6, h - 6);
  ctx.strokeStyle = '#2a2d32';
  ctx.lineWidth = 2;
  ctx.strokeRect(8, 8, w - 16, h - 16);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

/** Box depth in `panelToMesh`; viewer uses this for Z stacking only (same value, no layout math change). */
export const PANEL_MESH_THICKNESS_M = 0.055;

/** 4 / 6 / 8 vertical posts for grey metal racking (by array size). */
export function metalRackLegCount(panelCount: number): 4 | 6 | 8 {
  const n = Math.max(0, Math.floor(panelCount));
  if (n <= 8) return 4;
  if (n <= 18) return 6;
  return 8;
}

export function polygonToShape(
  polygon: Solar3DRoofPolygonPoint[],
  imageSize: { width: number; height: number },
  metersPerPixel: number
): THREE.Shape {
  const shape = new THREE.Shape();
  if (!polygon || polygon.length < 3) return shape;

  const toMeters = (p: Solar3DRoofPolygonPoint) => {
    const x = (p.x - imageSize.width / 2) * metersPerPixel;
    // Match image coordinates (Y-down) to 3D world (Y-up) by flipping Y.
    const y = -(p.y - imageSize.height / 2) * metersPerPixel;
    return { x, y };
  };

  const first = toMeters(polygon[0]);
  shape.moveTo(first.x, first.y);
  for (let i = 1; i < polygon.length; i++) {
    const pt = toMeters(polygon[i]);
    shape.lineTo(pt.x, pt.y);
  }
  shape.closePath();
  return shape;
}

export function panelToMesh(
  panel: Solar3DPanel,
  imageSize: { width: number; height: number },
  metersPerPixel: number,
  panelTopTexture: THREE.Texture
): THREE.Mesh {
  const frameColor = 0x3a3d44;
  const backsheetColor = 0x121418;

  // Standard residential solar panel (real-world size).
  // We clamp the 3D panel mesh size to avoid "giant panels" if upstream pixel units
  // are already in panel-units rather than raw pixels.
  const PANEL_WIDTH_M = 1.0;
  const PANEL_HEIGHT_M = 1.65;

  const centerX =
    (panel.x + panel.width / 2 - imageSize.width / 2) * metersPerPixel;
  const centerY =
    -((panel.y + panel.height / 2 - imageSize.height / 2) * metersPerPixel);

  // Keep panel position derived from `panelCoordinates` (converted via `metersPerPixel`),
  // but clamp panel dimensions to real-world values.
  // If a given rectangle is "wider than tall" in 2D, we treat it as a rotated panel.
  const isPortrait = panel.width <= panel.height;
  const widthM = isPortrait ? PANEL_WIDTH_M : PANEL_HEIGHT_M;
  const heightM = isPortrait ? PANEL_HEIGHT_M : PANEL_WIDTH_M;

  const geometry = new THREE.BoxGeometry(widthM, heightM, PANEL_MESH_THICKNESS_M);

  // Aluminium frame (long edges): MeshPhysicalMaterial for consistent IBL response.
  const frameMaterial = new THREE.MeshPhysicalMaterial({
    color: frameColor,
    roughness: 0.38,
    metalness: 0.82,
    clearcoat: 0.35,
    clearcoatRoughness: 0.45,
    envMapIntensity: 0.95,
  });

  // Matte polymer backsheet (rear face).
  const backsheetMaterial = new THREE.MeshPhysicalMaterial({
    color: backsheetColor,
    roughness: 0.92,
    metalness: 0.04,
    clearcoat: 0.08,
    clearcoatRoughness: 0.85,
    envMapIntensity: 0.35,
  });

  // Glass front: tempered AR glass with cell texture + clearcoat.
  const topMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    map: panelTopTexture,
    roughness: 0.2,
    metalness: 0.07,
    clearcoat: 0.94,
    clearcoatRoughness: 0.12,
    ior: 1.46,
    reflectivity: 0.55,
    envMapIntensity: 1.42,
    emissive: new THREE.Color(0x000000),
    emissiveIntensity: 0,
  });

  // BoxGeometry face order is: +X, -X, +Y, -Y, +Z, -Z
  const materials: THREE.Material[] = [
    frameMaterial, // +X
    frameMaterial, // -X
    frameMaterial, // +Y
    frameMaterial, // -Y
    topMaterial, // +Z (top)
    backsheetMaterial, // -Z (bottom)
  ];

  const mesh = new THREE.Mesh(geometry, materials);
  mesh.position.set(centerX, centerY, 0);

  // Optional in-plane rotation (not currently used by AIRoofLayout, but supported).
  if (panel.rotation != null) {
    mesh.rotation.z = THREE.MathUtils.degToRad(panel.rotation);
  }

  return mesh;
}

export function exportRendererToPNG(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera): string {
  renderer.render(scene, camera);
  // Requires `preserveDrawingBuffer: true` for reliable export after render.
  return renderer.domElement.toDataURL('image/png');
}

