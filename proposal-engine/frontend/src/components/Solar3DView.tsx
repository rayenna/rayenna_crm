import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import * as THREE from 'three';
import { PMREMGenerator } from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
// OrbitControls is shipped by `three`, but this repo does not have type declarations for the examples import.
// We only use it at runtime, so we suppress the compile-time module/type error.
// @ts-expect-error - missing types for three/examples module in this project
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import {
  createSolarPanelTexture,
  metalRackLegCount,
  PANEL_MESH_THICKNESS_M,
  panelToMesh,
  type Solar3DPanel,
} from '../lib/solar3DHelpers';
import {
  ROOF_LAYOUT_DEFAULT_PANEL_HEIGHT_M,
  ROOF_LAYOUT_DEFAULT_PANEL_WIDTH_M,
} from '../lib/roofLayoutConstants';

/** Orbit snapshot written on every OrbitControls change; parent ref survives 3D unmount (e.g. Save → 2D tab). */
export type Solar3DOrbitSnapshot = {
  position: [number, number, number];
  target: [number, number, number];
};

export type Solar3DViewHandle = {
  /** Renders the current camera/zoom (what you see) to PNG; does not change orbit or trigger download. */
  captureCurrentViewPng: () => Promise<string | null>;
};

/** Pixel-space translate of the shared roof outline (same contract as 2D bbox drag). */
export type Solar3DLayoutTranslate = { dxPx: number; dyPx: number };

/** Image-space CCW rotation (radians) around the roof polygon centroid. */
export type Solar3DLayoutRotate = { angleRad: number };

export interface Solar3DViewProps {
  roofPolygon: { x: number; y: number }[];
  // Pixel coords from Konva panelCoordinates
  panelCoordinates: Solar3DPanel[];
  imageSize: { width: number; height: number };
  // Satellite / roof image URL (used as texture on the roof top).
  // Optional: if missing, we fall back to a procedural texture.
  roofImageUrl?: string;
  metersPerPixel: number;
  // Matches the 2D summary's "Panel count" (ideal count), not necessarily panelCoordinates.length.
  panelCount?: number;
  // called when user clicks Export
  onExportPNG?: (dataUrl: string) => void;
  /** Fill explicit parent size (scroll/zoom wrapper). Keeps WebGL resolution in sync — no CSS-only scale blur. */
  fillParent?: boolean;
  /** Parent-owned; updated every orbit change. Used with `persistentLayoutKeyRef` after remount. */
  orbitStateRef?: React.MutableRefObject<Solar3DOrbitSnapshot | null>;
  /** Parent-owned last `layoutKey`; same as current key ⇒ restore `orbitStateRef` instead of default camera. */
  persistentLayoutKeyRef?: React.MutableRefObject<string>;
  /** When set, the control panel is portaled here (outside the WebGL frame) instead of floating over the canvas. */
  controlsPortalHost?: HTMLElement | null;
  /** Portrait module footprint (m); matches 2D `resolveModuleDimensions` when passed from roof layout. */
  portraitModuleSizeM?: { widthM: number; heightM: number };
  /**
   * Multiplies WebGL buffer size vs CSS size (supersampling). Use on narrow viewports instead of a scrollable
   * oversized wrapper so touch orbit works and layout does not fight scrollbars. Clamped internally.
   */
  resolutionScale?: number;
  /**
   * When true, dragging the panel array (not empty sky) translates the layout in image pixels.
   * On mobile, parent should gate this (e.g. “Move panels” tool) so orbit remains usable.
   */
  layoutDragEnabled?: boolean;
  /** Commit a translate after pointer-up (same polygon move as 2D). */
  onTranslateLayout?: (delta: Solar3DLayoutTranslate) => void;
  /** Commit a yaw after rotate-handle / two-finger gesture (rotates shared roof outline). */
  onRotateLayout?: (delta: Solar3DLayoutRotate) => void;
  /** Double-tap the array to flip portrait ↔ landscape (same as Orientation control). */
  onTogglePanelOrientation?: () => void;
}

const roofDepthM = 0.6; // panel base height above satellite (legacy “slab” depth; modules sit on metal rack)

/** Viewport px for floating controls (`position: fixed`); keep a grab strip on-screen. */
function clampFloatingControlsToViewport(
  x: number,
  y: number,
  shellW: number,
  shellH: number,
): { x: number; y: number } {
  if (typeof window === 'undefined') return { x, y };
  const minKeep = 72;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const minX = -shellW + minKeep;
  const maxX = vw - minKeep;
  const minY = -shellH + minKeep;
  const maxY = vh - minKeep;
  return {
    x: Math.max(minX, Math.min(x, maxX)),
    y: Math.max(minY, Math.min(y, maxY)),
  };
}

const Solar3DView = forwardRef<Solar3DViewHandle, Solar3DViewProps>(function Solar3DView(
  {
    roofPolygon,
    panelCoordinates,
    imageSize,
    roofImageUrl,
    metersPerPixel,
    panelCount,
    onExportPNG,
    fillParent = false,
    orbitStateRef,
    persistentLayoutKeyRef,
    controlsPortalHost = null,
    resolutionScale: resolutionScaleProp = 1,
    portraitModuleSizeM,
    layoutDragEnabled = false,
    onTranslateLayout,
    onRotateLayout,
    onTogglePanelOrientation,
  },
  ref,
) {
  const isDockedControls = !!controlsPortalHost;
  const resolutionScale = Math.min(4, Math.max(0.25, Number.isFinite(resolutionScaleProp) ? resolutionScaleProp : 1));
  const resolutionScaleRef = useRef(resolutionScale);
  resolutionScaleRef.current = resolutionScale;
  const mountRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const directionalLightRef = useRef<THREE.DirectionalLight | null>(null);
  const directionalLightBackRef = useRef<THREE.DirectionalLight | null>(null);
  const sunSphereRef = useRef<THREE.Mesh | null>(null);
  const panelsRef = useRef<THREE.Mesh[]>([]);
  const groupRef = useRef<THREE.Group | null>(null);
  const rackGroupRef = useRef<THREE.Group | null>(null);
  const roofSidesMeshRef = useRef<THREE.Mesh | null>(null);
  const roofTopMeshRef = useRef<THREE.Mesh | null>(null);
  const metalRackGroupRef = useRef<THREE.Group | null>(null);
  const layoutDragHandleRef = useRef<THREE.Mesh | null>(null);
  const layoutDragOutlineRef = useRef<THREE.LineSegments | null>(null);
  const layoutRotateHandleRef = useRef<THREE.Mesh | null>(null);
  const layoutManipGroupRef = useRef<THREE.Group | null>(null);
  const layoutManipPivotRef = useRef({ x: 0, y: 0 });
  const gridRef = useRef<THREE.GridHelper | null>(null);
  const groundPlaneRef = useRef<THREE.Mesh | null>(null);
  const groundGridRef = useRef<THREE.GridHelper | null>(null);
  const rackRailsRef = useRef<THREE.Mesh[]>([]);
  const rackStandoffsRef = useRef<THREE.Mesh[]>([]);
  const hasInitialFrameRef = useRef(false);
  const controlsRef = useRef<OrbitControls | null>(null);
  const tiltDegRef = useRef(10);
  const roofCenterRef = useRef<THREE.Vector3 | null>(null);
  /** When `lockCameraView` is on, default framing runs only if this key changes (not on tilt/texture rebuilds). */
  const lastCameraLayoutKeyRef = useRef<string>('');
  const satellitePlaneRef = useRef<THREE.Mesh | null>(null);
  const revealStartTimeRef = useRef<number | null>(null);
  const revealFromRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 20, 0));
  const revealToRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 12, 10));
  const revealFinishedRef = useRef(false);
  const environmentMapRef = useRef<THREE.Texture | null>(null);
  const layoutDragEnabledRef = useRef(layoutDragEnabled);
  layoutDragEnabledRef.current = layoutDragEnabled;
  const onTranslateLayoutRef = useRef(onTranslateLayout);
  onTranslateLayoutRef.current = onTranslateLayout;
  const onRotateLayoutRef = useRef(onRotateLayout);
  onRotateLayoutRef.current = onRotateLayout;
  const onTogglePanelOrientationRef = useRef(onTogglePanelOrientation);
  onTogglePanelOrientationRef.current = onTogglePanelOrientation;
  const metersPerPixelRef = useRef(metersPerPixel);
  metersPerPixelRef.current = metersPerPixel;
  const layoutDragSessionRef = useRef<{
    mode: 'translate' | 'rotate';
    pointerId: number;
    startHit: THREE.Vector3;
    midX: number;
    midY: number;
    worldDx: number;
    worldDy: number;
    /** World +Z yaw applied to manip group (radians). */
    worldRotZ: number;
    startAngle: number;
    moved: boolean;
  } | null>(null);
  const layoutPointersRef = useRef<
    Map<number, { clientX: number; clientY: number; hit: THREE.Vector3 }>
  >(new Map());
  const twoFingerRotateRef = useRef<{ startAngle: number; baseRotZ: number } | null>(null);
  const lastTapRef = useRef<{ t: number; x: number; y: number } | null>(null);
  const layoutDragPlaneRef = useRef(new THREE.Plane(new THREE.Vector3(0, 0, 1), 0));
  const layoutDragRaycasterRef = useRef(new THREE.Raycaster());
  const layoutDragNdcRef = useRef(new THREE.Vector2());
  const layoutDragHitRef = useRef(new THREE.Vector3());
  const [layoutDragging, setLayoutDragging] = useState(false);
  const [layoutGestureMode, setLayoutGestureMode] = useState<'translate' | 'rotate' | null>(null);

  const [tiltDeg, setTiltDeg] = useState(10);
  const [sunElevationDeg, setSunElevationDeg] = useState(45);
  const [sunAzimuthDeg, setSunAzimuthDeg] = useState(180);
  const [webglUnavailable, setWebglUnavailable] = useState(false);
  /** True while capturing PNG so HTML overlays can hide (e.g. screen capture). */
  const [exportingSnapshot, setExportingSnapshot] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const [badgeScale, setBadgeScale] = useState(1);
  const resetAnimFrameRef = useRef<number | null>(null);
  const badgePulseTimeoutRef = useRef<number | null>(null);

  // Minimized by default so it never blocks the roof view.
  const [controlsCollapsed, setControlsCollapsed] = useState(true);
  /** When true, orbit camera is not reset when tilt, sun sliders, texture load, or parent layout zoom resize rebuild geometry. */
  const [lockCameraView, setLockCameraView] = useState(true);
  /** Viewport offset (px) when floating controls use `position: fixed`. */
  const [controlsFloat, setControlsFloat] = useState({ x: 12, y: 12 });
  const controlsShellRef = useRef<HTMLDivElement | null>(null);
  const controlsFloatInitRef = useRef(false);
  const userDraggedControlsRef = useRef(false);
  const prevDockedControlsRef = useRef(isDockedControls);
  const controlsDragRef = useRef<{
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startX: number;
    startY: number;
  } | null>(null);
  const controlsFloatRef = useRef({ x: 12, y: 12 });

  const panelTopTexture = useMemo(() => {
    return createSolarPanelTexture();
  }, []);

  const roofProceduralTexture = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Base roof color.
    ctx.fillStyle = '#8b7355';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle noise so the top doesn't look flat.
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = img.data;
    for (let i = 0; i < data.length; i += 4) {
      const n = (Math.random() - 0.5) * 22; // keep it subtle
      data[i] = Math.max(0, Math.min(255, data[i] + n));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + n));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + n));
    }
    ctx.putImageData(img, 0, 0);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }, []);

  const [roofTexture, setRoofTexture] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    if (!roofImageUrl) {
      setRoofTexture(null);
      return;
    }

    // Use a 2D canvas-backed texture to avoid WebGL texture upload issues.
    // This makes the roof satellite overlay deterministic and export-safe.
    let isCancelled = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (isCancelled) return;
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(2, img.naturalWidth || img.width || 2);
      canvas.height = Math.max(2, img.naturalHeight || img.height || 2);

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setRoofTexture(null);
        return;
      }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.needsUpdate = true;
      setRoofTexture(tex);
    };
    img.onerror = () => {
      if (isCancelled) return;
      setRoofTexture(null);
    };
    img.src = roofImageUrl;

    return () => {
      isCancelled = true;
    };
  }, [roofImageUrl]);

  useEffect(() => {
    tiltDegRef.current = tiltDeg;
  }, [tiltDeg]);

  useEffect(() => {
    controlsFloatRef.current = controlsFloat;
  }, [controlsFloat]);

  useEffect(() => {
    if (prevDockedControlsRef.current && !isDockedControls) {
      controlsFloatInitRef.current = false;
    }
    prevDockedControlsRef.current = isDockedControls;
  }, [isDockedControls]);

  // Important for satellite UV mapping: use the full original image size,
  // otherwise the roof UVs won't line up with the texture loaded from `roofImageUrl`.
  const effectiveImageSize = useMemo(() => imageSize, [imageSize]);

  const sunAzimuthDegRef = useRef(sunAzimuthDeg);
  const sunElevationDegRef = useRef(sunElevationDeg);
  useEffect(() => {
    sunAzimuthDegRef.current = sunAzimuthDeg;
  }, [sunAzimuthDeg]);
  useEffect(() => {
    sunElevationDegRef.current = sunElevationDeg;
  }, [sunElevationDeg]);

  /**
   * Sun direction from roof center (Z-up). Takes explicit angles so slider updates never rely on ref timing.
   * Shadow ortho frustum stays symmetric in light space (Three.js); do not use world X/Y as left/right/top/bottom.
   */
  const applySunLightPositionsFromAngles = useCallback((azDeg: number, elDeg: number) => {
    const directionalLight = directionalLightRef.current;
    const directionalLightBack = directionalLightBackRef.current;
    if (!directionalLight) return;
    const roofCenter = roofCenterRef.current;
    if (!roofCenter) return;

    const azRad = THREE.MathUtils.degToRad(azDeg);
    const elRad = THREE.MathUtils.degToRad(elDeg);
    const sunDist = 50;
    const sx = Math.cos(elRad) * Math.sin(azRad) * sunDist;
    const sy = Math.cos(elRad) * Math.cos(azRad) * sunDist;
    const sz = Math.sin(elRad) * sunDist;

    directionalLight.position.set(roofCenter.x + sx, roofCenter.y + sy, roofCenter.z + sz);
    directionalLight.target.position.copy(roofCenter);
    directionalLight.target.updateMatrixWorld(true);
    directionalLight.updateMatrixWorld(true);

    if (directionalLightBack) {
      directionalLightBack.position.set(roofCenter.x - sx, roofCenter.y - sy, roofCenter.z + sz);
      directionalLightBack.target.position.copy(roofCenter);
      directionalLightBack.target.updateMatrixWorld(true);
      directionalLightBack.updateMatrixWorld(true);
    }

    if (sunSphereRef.current) {
      sunSphereRef.current.position.copy(directionalLight.position);
    }

    const cam = directionalLight.shadow.camera as THREE.OrthographicCamera;
    cam.updateProjectionMatrix();
    directionalLight.shadow.needsUpdate = true;
  }, []);

  useEffect(() => {
    if (!mountRef.current || !canvasRef.current) return;

    const mountEl = mountRef.current;
    const canvasEl = canvasRef.current;

    const width = Math.max(1, mountEl.clientWidth);
    const height = Math.max(520, Math.max(1, mountEl.clientHeight));
    const s0 = resolutionScaleRef.current;
    const rw = Math.max(1, Math.round(width * s0));
    const rh = Math.max(1, Math.round(height * s0));

    const scene = new THREE.Scene();
    scene.background = null;
    // Soft sky (interactive view only; export path temporarily forces white).
    scene.background = new THREE.Color(0xf0f4f8);
    // Use Z-up to match how roof/panel geometry is built.
    scene.up = new THREE.Vector3(0, 0, 1);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    // Must match Z-up scene; default camera.up is Y-up and inverts orbit / lookAt vs roof geometry.
    camera.up.set(0, 0, 1);
    camera.position.set(0, 20, 20);
    camera.lookAt(0, 0, 0);

    let renderer: THREE.WebGLRenderer | null = null;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        // Required so readback / drawImage after render is reliable across GPUs (blank exports otherwise).
        preserveDrawingBuffer: true,
        powerPreference: 'high-performance',
      });
    } catch {
      renderer = null;
    }
    if (!renderer) {
      setWebglUnavailable(true);
      return;
    }
    setWebglUnavailable(false);
    // Render to renderer-owned canvas; hide React canvas so it doesn't cover it.
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(rw, rh, false);
    renderer.setClearColor(0xf0f4f8, 1);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.domElement.className = 'block w-full h-full';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    // Ensure wheel/pinch events are captured by OrbitControls (not treated as page scroll).
    renderer.domElement.style.touchAction = 'none';
    mountRef.current.appendChild(renderer.domElement);
    const prevCanvasDisplay = canvasEl.style.display;
    canvasEl.style.display = 'none';

    // Controls must attach to the *visible* canvas (renderer.domElement), otherwise zoom/pan won't work.
    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;
    // Avoid over-restricting polar angles; Z-up framing can change with roof size.
    controls.maxPolarAngle = Math.PI / 3;
    controls.minDistance = 3;
    controls.maxDistance = 40;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = true;
    controls.enableZoom = true;
    controls.zoomSpeed = 1.1;
    controls.target.set(0, 0, 0);

    const onControlsChangeForOrbit = () => {
      if (!orbitStateRef) return;
      orbitStateRef.current = {
        position: [camera.position.x, camera.position.y, camera.position.z],
        target: [controls.target.x, controls.target.y, controls.target.z],
      };
    };
    controls.addEventListener('change', onControlsChangeForOrbit);

    // Prevent the parent scroll container from eating wheel zoom.
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
    };
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false });
    // IBL: room probe gives glass panels believable reflections (not flat paint).
    const pmrem = new PMREMGenerator(renderer);
    const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envMap;
    environmentMapRef.current = envMap;
    pmrem.dispose();

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.32);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xfffaf0, 1.55);
    directionalLight.castShadow = true;
    directionalLight.position.set(0, 10, 10);
    directionalLight.target.position.set(0, 0, 0);
    scene.add(directionalLight);
    scene.add(directionalLight.target);

    // Sky/ground bounce light for a more natural look.
    const hemisphereLight = new THREE.HemisphereLight(0xa8d4ff, 0xc8a96e, 0.42);
    scene.add(hemisphereLight);

    // Secondary light from the opposite side to soften shadows.
    const directionalLightBack = new THREE.DirectionalLight(0xffffff, 1.4 * 0.2);
    directionalLightBack.castShadow = false;
    directionalLightBack.position.set(0, 10, -10);
    directionalLightBack.target.position.set(0, 0, 0);
    scene.add(directionalLightBack);
    scene.add(directionalLightBack.target);

    // Visualize the sun direction with a small yellow sphere.
    const sunSphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 20, 20),
      new THREE.MeshBasicMaterial({ color: 0xffcc33 }),
    );
    sunSphere.position.copy(directionalLight.position);
    scene.add(sunSphere);
    sunSphereRef.current = sunSphere;

    rendererRef.current = renderer;
    sceneRef.current = scene;
    cameraRef.current = camera;
    directionalLightRef.current = directionalLight;
    directionalLightBackRef.current = directionalLightBack;

    const group = new THREE.Group();
    scene.add(group);
    groupRef.current = group;

                const rackGroup = new THREE.Group();
                group.add(rackGroup);
                rackGroupRef.current = rackGroup;

    let resizeRaf: number | null = null;
    const applyRendererSize = () => {
      if (!renderer) return;
      const w = Math.max(1, mountEl.clientWidth);
      const h = Math.max(520, Math.max(1, mountEl.clientHeight));
      const s = resolutionScaleRef.current;
      renderer.setSize(Math.max(1, Math.round(w * s)), Math.max(1, Math.round(h * s)), false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const resizeObserver = new ResizeObserver(() => {
      if (resizeRaf != null) return;
      resizeRaf = requestAnimationFrame(() => {
        resizeRaf = null;
        applyRendererSize();
      });
    });
    resizeObserver.observe(mountEl);

    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      if (revealStartTimeRef.current != null && !revealFinishedRef.current) {
        const now = performance.now();
        const elapsed = now - revealStartTimeRef.current;
        const t = Math.min(1, elapsed / 2000);
        camera.position.lerpVectors(revealFromRef.current, revealToRef.current, t);
        if (t >= 1) {
          revealFinishedRef.current = true;
        }
      }
      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    const raycaster = layoutDragRaycasterRef.current;
    const ndc = layoutDragNdcRef.current;
    const hitPoint = layoutDragHitRef.current;
    const dragPlane = layoutDragPlaneRef.current;

    const setNdcFromEvent = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const w = Math.max(1, rect.width);
      const h = Math.max(1, rect.height);
      ndc.x = ((e.clientX - rect.left) / w) * 2 - 1;
      ndc.y = -((e.clientY - rect.top) / h) * 2 + 1;
    };

    const collectDragTargets = (): THREE.Object3D[] => {
      const targets: THREE.Object3D[] = [];
      if (layoutDragHandleRef.current) targets.push(layoutDragHandleRef.current);
      if (layoutDragOutlineRef.current) targets.push(layoutDragOutlineRef.current);
      if (layoutRotateHandleRef.current) targets.push(layoutRotateHandleRef.current);
      for (const p of panelsRef.current) targets.push(p);
      if (metalRackGroupRef.current) targets.push(metalRackGroupRef.current);
      return targets;
    };

    const resetManipVisual = () => {
      const manip = layoutManipGroupRef.current;
      if (!manip) return;
      manip.position.set(layoutManipPivotRef.current.x, layoutManipPivotRef.current.y, 0);
      manip.rotation.z = 0;
    };

    const applyManipVisual = (worldDx: number, worldDy: number, worldRotZ: number) => {
      const manip = layoutManipGroupRef.current;
      if (!manip) return;
      manip.position.set(
        layoutManipPivotRef.current.x + worldDx,
        layoutManipPivotRef.current.y + worldDy,
        0,
      );
      manip.rotation.z = worldRotZ;
    };

    const angleAboutPivot = (hit: THREE.Vector3, midX: number, midY: number) =>
      Math.atan2(hit.y - midY, hit.x - midX);

    const tryDoubleTapToggle = (e: PointerEvent, onArray: boolean) => {
      if (!onArray || !onTogglePanelOrientationRef.current) return false;
      const now = performance.now();
      const prev = lastTapRef.current;
      lastTapRef.current = { t: now, x: e.clientX, y: e.clientY };
      if (!prev) return false;
      const dt = now - prev.t;
      const dist = Math.hypot(e.clientX - prev.x, e.clientY - prev.y);
      if (dt <= 350 && dist <= 36) {
        lastTapRef.current = null;
        onTogglePanelOrientationRef.current();
        return true;
      }
      return false;
    };

    const endLayoutDrag = (e: PointerEvent, commit: boolean) => {
      const session = layoutDragSessionRef.current;
      layoutPointersRef.current.delete(e.pointerId);

      // Two-finger rotate end when either finger lifts
      if (twoFingerRotateRef.current && layoutPointersRef.current.size < 2) {
        const manip = layoutManipGroupRef.current;
        const worldRotZ = manip?.rotation.z ?? 0;
        twoFingerRotateRef.current = null;
        layoutDragSessionRef.current = null;
        setLayoutDragging(false);
        setLayoutGestureMode(null);
        if (controls) controls.enabled = true;
        try {
          renderer.domElement.releasePointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
        if (commit && Math.abs(worldRotZ) > 0.04) {
          // World +Z → image CCW (Y-down): negate
          onRotateLayoutRef.current?.({ angleRad: -worldRotZ });
        } else {
          resetManipVisual();
        }
        return;
      }

      if (!session || session.pointerId !== e.pointerId) return;
      layoutDragSessionRef.current = null;
      setLayoutDragging(false);
      setLayoutGestureMode(null);
      try {
        renderer.domElement.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      if (controls) controls.enabled = true;
      renderer.domElement.style.cursor = layoutDragEnabledRef.current ? 'grab' : '';

      const mpp = metersPerPixelRef.current;
      if (!commit || !session.moved || !Number.isFinite(mpp) || mpp <= 0) {
        resetManipVisual();
        return;
      }

      if (session.mode === 'rotate') {
        if (Math.abs(session.worldRotZ) < 0.04) {
          resetManipVisual();
          return;
        }
        onRotateLayoutRef.current?.({ angleRad: -session.worldRotZ });
        return;
      }

      const dxPx = session.worldDx / mpp;
      const dyPx = -session.worldDy / mpp;
      if (Math.abs(dxPx) + Math.abs(dyPx) <= 8) {
        resetManipVisual();
        return;
      }
      onTranslateLayoutRef.current?.({ dxPx, dyPx });
    };

    const onPointerDown = (e: PointerEvent) => {
      if (!layoutDragEnabledRef.current) return;
      if (!onTranslateLayoutRef.current && !onRotateLayoutRef.current) return;
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      if (!camera) return;
      setNdcFromEvent(e);
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObjects(collectDragTargets(), true);
      const onArray = hits.length > 0;

      if (tryDoubleTapToggle(e, onArray)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        return;
      }

      if (!onArray) return;

      const z = hits[0]?.point.z ?? 2.6;
      dragPlane.set(new THREE.Vector3(0, 0, 1), -z);
      if (!raycaster.ray.intersectPlane(dragPlane, hitPoint)) return;

      const midX = layoutManipPivotRef.current.x;
      const midY = layoutManipPivotRef.current.y;
      layoutPointersRef.current.set(e.pointerId, {
        clientX: e.clientX,
        clientY: e.clientY,
        hit: hitPoint.clone(),
      });

      // Second finger on array → two-finger rotate
      if (layoutPointersRef.current.size >= 2 && onRotateLayoutRef.current) {
        const pts = [...layoutPointersRef.current.values()];
        const a = pts[0]!.hit;
        const b = pts[1]!.hit;
        const startAngle = Math.atan2(b.y - a.y, b.x - a.x);
        const baseRotZ = layoutManipGroupRef.current?.rotation.z ?? 0;
        twoFingerRotateRef.current = { startAngle, baseRotZ };
        layoutDragSessionRef.current = null;
        e.preventDefault();
        e.stopImmediatePropagation();
        if (controls) controls.enabled = false;
        renderer.domElement.setPointerCapture(e.pointerId);
        setLayoutDragging(true);
        setLayoutGestureMode('rotate');
        return;
      }

      const hitObj = hits[0]?.object;
      let isRotateHandle = false;
      let o: THREE.Object3D | null = hitObj ?? null;
      while (o) {
        if (o.userData?.layoutRotateHandle) {
          isRotateHandle = true;
          break;
        }
        o = o.parent;
      }

      const mode: 'translate' | 'rotate' =
        isRotateHandle && onRotateLayoutRef.current ? 'rotate' : 'translate';
      if (mode === 'translate' && !onTranslateLayoutRef.current) return;
      if (mode === 'rotate' && !onRotateLayoutRef.current) return;

      e.preventDefault();
      e.stopImmediatePropagation();
      if (controls) controls.enabled = false;
      renderer.domElement.setPointerCapture(e.pointerId);
      renderer.domElement.style.cursor = mode === 'rotate' ? 'grabbing' : 'grabbing';

      layoutDragSessionRef.current = {
        mode,
        pointerId: e.pointerId,
        startHit: hitPoint.clone(),
        midX,
        midY,
        worldDx: layoutManipGroupRef.current
          ? layoutManipGroupRef.current.position.x - midX
          : 0,
        worldDy: layoutManipGroupRef.current
          ? layoutManipGroupRef.current.position.y - midY
          : 0,
        worldRotZ: layoutManipGroupRef.current?.rotation.z ?? 0,
        startAngle: angleAboutPivot(hitPoint, midX, midY),
        moved: false,
      };
      setLayoutDragging(true);
      setLayoutGestureMode(mode);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (layoutPointersRef.current.has(e.pointerId)) {
        setNdcFromEvent(e);
        raycaster.setFromCamera(ndc, camera!);
        if (raycaster.ray.intersectPlane(dragPlane, hitPoint)) {
          layoutPointersRef.current.set(e.pointerId, {
            clientX: e.clientX,
            clientY: e.clientY,
            hit: hitPoint.clone(),
          });
        }
      }

      // Two-finger rotate
      if (twoFingerRotateRef.current && layoutPointersRef.current.size >= 2) {
        e.preventDefault();
        const pts = [...layoutPointersRef.current.values()];
        const a = pts[0]!.hit;
        const b = pts[1]!.hit;
        const ang = Math.atan2(b.y - a.y, b.x - a.x);
        const delta = ang - twoFingerRotateRef.current.startAngle;
        const worldRotZ = twoFingerRotateRef.current.baseRotZ + delta;
        const manip = layoutManipGroupRef.current;
        const dx = manip ? manip.position.x - layoutManipPivotRef.current.x : 0;
        const dy = manip ? manip.position.y - layoutManipPivotRef.current.y : 0;
        applyManipVisual(dx, dy, worldRotZ);
        return;
      }

      const session = layoutDragSessionRef.current;
      if (!session) {
        if (!layoutDragEnabledRef.current || !camera) return;
        setNdcFromEvent(e);
        raycaster.setFromCamera(ndc, camera);
        const overHits = raycaster.intersectObjects(collectDragTargets(), true);
        let cursor = '';
        if (overHits.length) {
          let o: THREE.Object3D | null = overHits[0]?.object ?? null;
          let rot = false;
          while (o) {
            if (o.userData?.layoutRotateHandle) {
              rot = true;
              break;
            }
            o = o.parent;
          }
          cursor = rot ? 'crosshair' : 'grab';
        }
        renderer.domElement.style.cursor = cursor;
        return;
      }
      if (session.pointerId !== e.pointerId) return;
      if (!camera) return;
      e.preventDefault();
      setNdcFromEvent(e);
      raycaster.setFromCamera(ndc, camera);
      if (!raycaster.ray.intersectPlane(dragPlane, hitPoint)) return;

      if (session.mode === 'rotate') {
        const ang = angleAboutPivot(hitPoint, session.midX, session.midY);
        let delta = ang - session.startAngle;
        // unwrap
        while (delta > Math.PI) delta -= Math.PI * 2;
        while (delta < -Math.PI) delta += Math.PI * 2;
        if (Math.abs(delta) > 0.04) session.moved = true;
        if (!session.moved) return;
        session.worldRotZ = delta;
        applyManipVisual(session.worldDx, session.worldDy, session.worldRotZ);
        return;
      }

      const worldDx = hitPoint.x - session.startHit.x;
      const worldDy = hitPoint.y - session.startHit.y;
      const mpp = metersPerPixelRef.current || 0.149;
      const distPx = (Math.abs(worldDx) + Math.abs(worldDy)) / mpp;
      if (distPx > 8) session.moved = true;
      if (!session.moved) return;
      session.worldDx = worldDx;
      session.worldDy = worldDy;
      applyManipVisual(worldDx, worldDy, session.worldRotZ);
    };

    const onPointerUp = (e: PointerEvent) => endLayoutDrag(e, true);
    const onPointerCancel = (e: PointerEvent) => endLayoutDrag(e, false);

    renderer.domElement.addEventListener('pointerdown', onPointerDown, true);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('pointercancel', onPointerCancel);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (resizeRaf != null) cancelAnimationFrame(resizeRaf);
      resizeObserver.disconnect();

      renderer.domElement.removeEventListener('pointerdown', onPointerDown, true);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointercancel', onPointerCancel);
      layoutDragSessionRef.current = null;
      layoutPointersRef.current.clear();
      twoFingerRotateRef.current = null;

      scene.environment = null;
      if (environmentMapRef.current) {
        environmentMapRef.current.dispose();
        environmentMapRef.current = null;
      }

      // Ensure we dispose GPU resources.
      if (groupRef.current) {
        groupRef.current.traverse((obj) => {
          const mesh = obj as THREE.Mesh;
          if (mesh.geometry) mesh.geometry.dispose();
          const material = (mesh as any).material as THREE.Material | THREE.Material[] | undefined;
          if (Array.isArray(material)) {
            for (const m of material) m.dispose();
          } else if (material) {
            material.dispose();
          }
        });
      }

      controls.removeEventListener('change', onControlsChangeForOrbit);
      controls.dispose();
      renderer.domElement.removeEventListener('wheel', onWheel as any);
      renderer.dispose();
      canvasEl.style.display = prevCanvasDisplay;
      if (renderer.domElement.parentElement === mountEl) {
        mountEl.removeChild(renderer.domElement);
      }

      rendererRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
      directionalLightRef.current = null;
      directionalLightBackRef.current = null;
      panelsRef.current = [];
      groupRef.current = null;
      rackGroupRef.current = null;
      roofSidesMeshRef.current = null;
      roofTopMeshRef.current = null;
      metalRackGroupRef.current = null;
      layoutDragHandleRef.current = null;
      layoutDragOutlineRef.current = null;
      layoutRotateHandleRef.current = null;
      layoutManipGroupRef.current = null;
      gridRef.current = null;
      groundPlaneRef.current = null;
      groundGridRef.current = null;
      hasInitialFrameRef.current = false;
      roofCenterRef.current = null;
      revealStartTimeRef.current = null;
      revealFromRef.current = new THREE.Vector3(0, 20, 0);
      revealToRef.current = new THREE.Vector3(0, 8, 7);
      revealFinishedRef.current = false;
      controlsRef.current = null;
    };
  }, [orbitStateRef]);

  useEffect(() => {
    const renderer = rendererRef.current;
    const camera = cameraRef.current;
    const mountEl = mountRef.current;
    if (!renderer || !camera || !mountEl) return;
    const w = Math.max(1, mountEl.clientWidth);
    const h = Math.max(520, Math.max(1, mountEl.clientHeight));
    const s = resolutionScaleRef.current;
    renderer.setSize(Math.max(1, Math.round(w * s)), Math.max(1, Math.round(h * s)), false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }, [resolutionScale]);

  useEffect(() => {
    const handle = layoutDragHandleRef.current;
    const outline = layoutDragOutlineRef.current;
    const rot = layoutRotateHandleRef.current;
    if (handle) {
      handle.visible = layoutDragEnabled;
      const mat = handle.material as THREE.MeshBasicMaterial;
      mat.opacity = layoutDragEnabled ? (layoutDragging ? 0.2 : 0.1) : 0;
      mat.needsUpdate = true;
    }
    if (outline) outline.visible = layoutDragEnabled;
    if (rot) rot.visible = layoutDragEnabled;
    layoutManipGroupRef.current?.traverse((obj) => {
      if (obj.userData?.layoutRotateHandle) obj.visible = layoutDragEnabled;
    });
  }, [layoutDragEnabled, layoutDragging]);

  useEffect(() => {
    const group = groupRef.current;
    const directionalLight = directionalLightRef.current;
    if (!group || !directionalLight) return;
    if (!roofPolygon || roofPolygon.length < 3) return;
    if (!effectiveImageSize) return;
    if (panelCoordinates == null) return;
    if (!Number.isFinite(metersPerPixel) || !Number.isFinite(effectiveImageSize.width) || !Number.isFinite(effectiveImageSize.height)) {
      return;
    }

    // Geometry is built in XY plane with thickness in Z.
    // We use Z-up (scene/camera) so we do NOT rotate the whole group here.
    group.position.set(0, 0, 0);

    const disposeMesh = (mesh: THREE.Mesh) => {
      mesh.geometry?.dispose?.();
      const material = (mesh as any).material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(material)) {
        for (const m of material) m.dispose();
      } else if (material) {
        material.dispose();
      }
    };

    // Roof
    if (satellitePlaneRef.current) {
      sceneRef.current?.remove(satellitePlaneRef.current);
      disposeMesh(satellitePlaneRef.current);
      satellitePlaneRef.current = null;
    }
    if (roofSidesMeshRef.current) {
      group.remove(roofSidesMeshRef.current);
      disposeMesh(roofSidesMeshRef.current);
      roofSidesMeshRef.current = null;
    }
    if (roofTopMeshRef.current) {
      group.remove(roofTopMeshRef.current);
      disposeMesh(roofTopMeshRef.current);
      roofTopMeshRef.current = null;
    }

    // 1) Satellite image as a flat base plane (NOT mapped to the polygon).
    const imgWm = effectiveImageSize.width * metersPerPixel;
    const imgHm = effectiveImageSize.height * metersPerPixel;
    const baseTex = roofTexture ?? roofProceduralTexture ?? null;
    if (baseTex) {
      baseTex.flipY = false;
      baseTex.needsUpdate = true;
    }
    const satellitePlane = new THREE.Mesh(
      new THREE.PlaneGeometry(imgWm, imgHm),
      new THREE.MeshBasicMaterial({
        map: baseTex ?? undefined,
        color: baseTex ? 0xffffff : 0x8b7355,
        side: THREE.DoubleSide,
      }),
    );
    satellitePlane.position.set(0, 0, 0);
    satellitePlane.receiveShadow = false;
    sceneRef.current?.add(satellitePlane);
    satellitePlaneRef.current = satellitePlane;

    const roofBaseZ = 2; // meters above satellite — panel & racking reference
    const deckZ = roofBaseZ + roofDepthM - 0.03; // tilted rail plane under modules

    if (metalRackGroupRef.current) {
      const mats = new Set<THREE.Material>();
      metalRackGroupRef.current.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const material = (mesh as any).material as THREE.Material | undefined;
        if (material) mats.add(material);
      });
      metalRackGroupRef.current.parent?.remove(metalRackGroupRef.current);
      for (const m of mats) m.dispose();
      metalRackGroupRef.current = null;
    }

    if (layoutDragHandleRef.current) {
      group.remove(layoutDragHandleRef.current);
      layoutDragHandleRef.current.geometry.dispose();
      const hm = layoutDragHandleRef.current.material as THREE.Material;
      hm.dispose();
      layoutDragHandleRef.current = null;
    }
    if (layoutDragOutlineRef.current) {
      group.remove(layoutDragOutlineRef.current);
      layoutDragOutlineRef.current.geometry.dispose();
      const om = layoutDragOutlineRef.current.material as THREE.Material;
      om.dispose();
      layoutDragOutlineRef.current = null;
    }
    if (layoutRotateHandleRef.current) {
      layoutRotateHandleRef.current.geometry.dispose();
      const rm = layoutRotateHandleRef.current.material as THREE.Material;
      rm.dispose();
      layoutRotateHandleRef.current = null;
    }
    if (layoutManipGroupRef.current) {
      group.remove(layoutManipGroupRef.current);
      layoutManipGroupRef.current = null;
    }

    const tiltNow = tiltDegRef.current;
    const tiltNowRad = THREE.MathUtils.degToRad(tiltNow);
    const desiredPanelCount =
      panelCount != null ? Math.max(0, Math.floor(panelCount)) : panelCoordinates.length;
    const candidatePanels =
      desiredPanelCount < panelCoordinates.length
        ? panelCoordinates.slice(0, desiredPanelCount)
        : panelCoordinates;
    const panelsToRender = candidatePanels;

    type PanelInst = { centerX: number; centerY: number; widthM: number; heightM: number };
    const portraitW =
      portraitModuleSizeM?.widthM != null &&
      Number.isFinite(portraitModuleSizeM.widthM) &&
      portraitModuleSizeM.widthM > 0
        ? portraitModuleSizeM.widthM
        : ROOF_LAYOUT_DEFAULT_PANEL_WIDTH_M;
    const portraitH =
      portraitModuleSizeM?.heightM != null &&
      Number.isFinite(portraitModuleSizeM.heightM) &&
      portraitModuleSizeM.heightM > 0
        ? portraitModuleSizeM.heightM
        : ROOF_LAYOUT_DEFAULT_PANEL_HEIGHT_M;
    const panelInsts: PanelInst[] = panelsToRender.map((p) => {
      const centerX = (p.x + p.width / 2 - effectiveImageSize.width / 2) * metersPerPixel;
      const centerY = -((p.y + p.height / 2 - effectiveImageSize.height / 2) * metersPerPixel);
      const isPortrait = p.width <= p.height;
      const panelWidthM = isPortrait ? portraitW : portraitH;
      const panelHeightM = isPortrait ? portraitH : portraitW;
      return { centerX, centerY, widthM: panelWidthM, heightM: panelHeightM };
    });

    let minPx = Infinity;
    let maxPx = -Infinity;
    let minPy = Infinity;
    let maxPy = -Infinity;
    for (const inst of panelInsts) {
      const hw = inst.widthM / 2;
      const hh = inst.heightM / 2;
      minPx = Math.min(minPx, inst.centerX - hw);
      maxPx = Math.max(maxPx, inst.centerX + hw);
      minPy = Math.min(minPy, inst.centerY - hh);
      maxPy = Math.max(maxPy, inst.centerY + hh);
    }
    const margin = 0.16;
    if (panelInsts.length === 0) {
      minPx = -0.5;
      maxPx = 0.5;
      minPy = -0.5;
      maxPy = 0.5;
    } else {
      minPx -= margin;
      maxPx += margin;
      minPy -= margin;
      maxPy += margin;
    }
    const midX = (minPx + maxPx) / 2;
    const midY = (minPy + maxPy) / 2;
    const spanX = Math.max(0.45, maxPx - minPx);
    const spanY = Math.max(0.45, maxPy - minPy);

    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x3a3d42,
      metalness: 0.72,
      roughness: 0.42,
      envMapIntensity: 1.02,
    });
    const footMat = new THREE.MeshStandardMaterial({
      color: 0x5c6068,
      metalness: 0.42,
      roughness: 0.7,
      envMapIntensity: 0.62,
    });

    const rackRoot = new THREE.Group();
    const tiltedRack = new THREE.Group();
    tiltedRack.position.set(midX, midY, deckZ);
    tiltedRack.rotation.x = tiltNowRad;

    const beamT = 0.043;
    const beamD = 0.074;
    const sx = spanX;
    const sy = spanY;

    const addRailAlongX = (localY: number) => {
      const g = new THREE.BoxGeometry(sx, beamT, beamD);
      const m = new THREE.Mesh(g, frameMat);
      m.castShadow = true;
      m.receiveShadow = true;
      m.position.set(0, localY, 0);
      tiltedRack.add(m);
    };
    const addRailAlongY = (localX: number) => {
      const g = new THREE.BoxGeometry(beamT, sy, beamD);
      const m = new THREE.Mesh(g, frameMat);
      m.castShadow = true;
      m.receiveShadow = true;
      m.position.set(localX, 0, 0);
      tiltedRack.add(m);
    };

    addRailAlongX(-sy / 2);
    addRailAlongX(sy / 2);
    addRailAlongY(-sx / 2);
    addRailAlongY(sx / 2);

    const innerPurlins = Math.min(5, Math.max(1, Math.ceil(panelsToRender.length / 5)));
    for (let i = 1; i < innerPurlins; i++) {
      const fy = -sy / 2 + (sy * i) / innerPurlins;
      if (Math.abs(fy + sy / 2) < 0.07 || Math.abs(fy - sy / 2) < 0.07) continue;
      addRailAlongX(fy);
    }

    // Diagonal + cross bracing (same material as rails; sits slightly below deck).
    const braceT = 0.024;
    const addPlanarBrace = (x1: number, y1: number, x2: number, y2: number) => {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.max(0.12, Math.hypot(dx, dy));
      const cx = (x1 + x2) / 2;
      const cy = (y1 + y2) / 2;
      const angle = Math.atan2(dy, dx);
      const g = new THREE.BoxGeometry(len, braceT, braceT);
      const m = new THREE.Mesh(g, frameMat);
      m.position.set(cx, cy, -beamD * 0.44);
      m.rotation.z = angle;
      m.castShadow = true;
      m.receiveShadow = true;
      tiltedRack.add(m);
    };
    if (sx > 0.95 && sy > 0.5) {
      const ix = Math.min(0.11, sx * 0.08);
      const iy = Math.min(0.1, sy * 0.08);
      addPlanarBrace(-sx / 2 + ix, -sy / 2 + iy, -sx / 2 + ix + sx * 0.42, sy / 2 - iy);
      addPlanarBrace(sx / 2 - ix, -sy / 2 + iy, sx / 2 - ix - sx * 0.42, sy / 2 - iy);
      // Wide bay (~2.5 m+ along X): mid-span horizontal cross-tie so the frame reads clearly stiffened.
      if (sx >= 2.52) {
        addPlanarBrace(-sx / 2 + ix, 0, sx / 2 - ix, 0);
      }
    }

    rackRoot.add(tiltedRack);

    // Leg Y positions follow panel row lines (front / back of array) when possible.
    let rowFrontY = minPy;
    let rowBackY = maxPy;
    if (panelInsts.length > 0) {
      const ysSorted = [...new Set(panelInsts.map((i) => Math.round(i.centerY * 4) / 4))].sort(
        (a, b) => a - b,
      );
      if (ysSorted.length >= 2) {
        rowFrontY = ysSorted[0]!;
        rowBackY = ysSorted[ysSorted.length - 1]!;
      } else if (ysSorted.length === 1) {
        const y0 = ysSorted[0]!;
        const pad = Math.min(0.42, Math.max(0.2, spanY * 0.24));
        rowFrontY = y0 - pad;
        rowBackY = y0 + pad;
      }
    }

    const nLegs = metalRackLegCount(panelsToRender.length);
    const legW = 0.056;
    const legTopZ = roofBaseZ + roofDepthM - 0.04;
    const legBottomZ = roofBaseZ - 1.15;
    const legLen = Math.max(0.45, legTopZ - legBottomZ);
    const legZCenter = legBottomZ + legLen / 2;

    const legXY: { x: number; y: number }[] = [];
    if (nLegs === 4) {
      legXY.push(
        { x: minPx, y: rowFrontY },
        { x: maxPx, y: rowFrontY },
        { x: maxPx, y: rowBackY },
        { x: minPx, y: rowBackY },
      );
    } else if (nLegs === 6) {
      const xs = [minPx, (minPx + maxPx) / 2, maxPx];
      for (const x of xs) {
        legXY.push({ x, y: rowFrontY }, { x, y: rowBackY });
      }
    } else {
      const xs = [minPx, minPx + spanX / 3, minPx + (2 * spanX) / 3, maxPx];
      for (const x of xs) {
        legXY.push({ x, y: rowFrontY }, { x, y: rowBackY });
      }
    }

    for (const { x, y } of legXY) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(legW, legW, legLen), frameMat);
      leg.position.set(x, y, legZCenter);
      leg.castShadow = true;
      leg.receiveShadow = true;
      rackRoot.add(leg);

      const pad = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.13, 0.035), footMat);
      pad.position.set(x, y, legBottomZ - 0.022);
      pad.castShadow = true;
      pad.receiveShadow = true;
      rackRoot.add(pad);
    }

    metalRackGroupRef.current = rackRoot;

    // Parent rack under manip group (relative to array center) so translate+rotate share one pivot.
    const manip = new THREE.Group();
    manip.position.set(midX, midY, 0);
    layoutManipPivotRef.current = { x: midX, y: midY };
    for (const child of rackRoot.children) {
      child.position.x -= midX;
      child.position.y -= midY;
    }
    manip.add(rackRoot);
    group.add(manip);
    layoutManipGroupRef.current = manip;

    roofSidesMeshRef.current = null;
    roofTopMeshRef.current = null;

    const roofBoxAligned = new THREE.Box3(
      new THREE.Vector3(minPx - 0.08, minPy - 0.08, legBottomZ - 0.1),
      new THREE.Vector3(maxPx + 0.08, maxPy + 0.08, roofBaseZ + roofDepthM + 0.45),
    );
    const roofCenterAligned = roofBoxAligned.getCenter(new THREE.Vector3());
    roofCenterRef.current = roofCenterAligned;

    // Step 3: ground plane + subtle grid.
    if (groundPlaneRef.current) {
      sceneRef.current?.remove(groundPlaneRef.current);
      groundPlaneRef.current.geometry.dispose();
      const material = groundPlaneRef.current.material as THREE.Material;
      if (material) material.dispose();
      groundPlaneRef.current = null;
    }
    if (groundGridRef.current) {
      sceneRef.current?.remove(groundGridRef.current);
      groundGridRef.current.geometry?.dispose?.();
      const material = groundGridRef.current.material as any;
      if (material?.dispose) material.dispose();
      groundGridRef.current = null;
    }

    // Ground plane with shadow catcher for spatial context.
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(5000, 5000),
      new THREE.ShadowMaterial({ opacity: 0.2 }),
    );
    ground.rotation.x = 0;
    ground.position.z = roofBaseZ - 10;
    ground.receiveShadow = true;
    sceneRef.current?.add(ground);
    groundPlaneRef.current = ground;
    groundGridRef.current = null;

    // Shadow camera based on roof bounding volume.
    directionalLight.shadow.mapSize.set(2048, 2048);
    directionalLight.shadow.bias = -0.00022;
    directionalLight.shadow.normalBias = 0.032;
    const roofSize = roofBoxAligned.getSize(new THREE.Vector3());
    const roofSpan = Math.max(roofSize.x, roofSize.y, 4);
    const shadowHalf = roofSpan * 0.55;
    const cam = directionalLight.shadow.camera as THREE.OrthographicCamera;
    cam.left = -shadowHalf;
    cam.right = shadowHalf;
    cam.top = shadowHalf;
    cam.bottom = -shadowHalf;
    cam.near = 0.1;
    cam.far = 120;

    applySunLightPositionsFromAngles(sunAzimuthDegRef.current, sunElevationDegRef.current);

    // Panels
    for (const old of panelsRef.current) {
      old.parent?.remove(old);
      disposeMesh(old);
    }
    const panels: THREE.Mesh[] = [];
    const manipForPanels = layoutManipGroupRef.current;

    for (const panel of panelsToRender) {
      const mesh = panelToMesh(panel, effectiveImageSize, metersPerPixel, panelTopTexture);
      // Glass top (+Z face, index 4): single-sided for believable reflections; frame: double-sided.
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((m, i) => {
          m.side = i === 4 ? THREE.FrontSide : THREE.DoubleSide;
          m.needsUpdate = true;
        });
      } else {
        mesh.material.side = THREE.DoubleSide;
        mesh.material.needsUpdate = true;
      }
      // 3D frame outline (visual only; same box geometry as mesh).
      const frameOutline = new THREE.LineSegments(
        new THREE.EdgesGeometry(mesh.geometry, 24),
        new THREE.LineBasicMaterial({
          color: 0x141a22,
          transparent: true,
          opacity: 0.88,
        }),
      );
      mesh.add(frameOutline);

      // Apply tilt around each panel's local X-axis (panel center).
      mesh.rotation.x = tiltNowRad;
      // Place panels ON TOP of the roof (local to manip pivot).
      mesh.position.x -= midX;
      mesh.position.y -= midY;
      mesh.position.z = roofBaseZ + roofDepthM + PANEL_MESH_THICKNESS_M / 2 + 0.02;
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      (manipForPanels ?? group).add(mesh);
      panels.push(mesh);
    }
    panelsRef.current = panels;

    // Drag pad + outline + rotate handle (local to manip).
    if (panelInsts.length > 0 && manipForPanels) {
      const padZ = roofBaseZ + roofDepthM + PANEL_MESH_THICKNESS_M + 0.08;
      const padGeo = new THREE.PlaneGeometry(spanX + 0.55, spanY + 0.55);
      const pad = new THREE.Mesh(
        padGeo,
        new THREE.MeshBasicMaterial({
          color: 0x16a34a,
          transparent: true,
          opacity: layoutDragEnabledRef.current ? 0.1 : 0.0,
          depthWrite: false,
          side: THREE.DoubleSide,
        }),
      );
      pad.position.set(0, 0, padZ);
      pad.userData.layoutDragHandle = true;
      pad.visible = layoutDragEnabledRef.current;
      manipForPanels.add(pad);
      layoutDragHandleRef.current = pad;

      const edgeSrc = new THREE.PlaneGeometry(spanX + 0.55, spanY + 0.55);
      const outline = new THREE.LineSegments(
        new THREE.EdgesGeometry(edgeSrc),
        new THREE.LineBasicMaterial({
          color: 0x16a34a,
          transparent: true,
          opacity: 0.95,
          depthWrite: false,
        }),
      );
      edgeSrc.dispose();
      outline.position.set(0, 0, padZ + 0.01);
      outline.userData.layoutDragHandle = true;
      outline.visible = layoutDragEnabledRef.current;
      manipForPanels.add(outline);
      layoutDragOutlineRef.current = outline;

      // Rotate handle — large touch target above the array (north of bbox in local Y).
      const rotHandle = new THREE.Mesh(
        new THREE.SphereGeometry(Math.max(0.18, Math.min(0.32, spanY * 0.12)), 16, 12),
        new THREE.MeshBasicMaterial({
          color: 0x16a34a,
          transparent: true,
          opacity: 0.92,
          depthWrite: false,
        }),
      );
      rotHandle.position.set(0, spanY / 2 + 0.55, padZ + 0.12);
      rotHandle.userData.layoutRotateHandle = true;
      rotHandle.visible = layoutDragEnabledRef.current;
      manipForPanels.add(rotHandle);
      layoutRotateHandleRef.current = rotHandle;

      // Stem from outline to rotate handle (visual affordance).
      const stemLen = 0.55;
      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.025, stemLen, 8),
        new THREE.MeshBasicMaterial({
          color: 0x16a34a,
          transparent: true,
          opacity: 0.75,
          depthWrite: false,
        }),
      );
      stem.position.set(0, spanY / 2 + stemLen / 2, padZ + 0.06);
      stem.userData.layoutRotateHandle = true;
      stem.visible = layoutDragEnabledRef.current;
      manipForPanels.add(stem);
    }

    if (rackGroupRef.current) {
      rackGroupRef.current.children.slice().forEach((child) => {
        const mesh = child as unknown as THREE.Mesh;
        rackGroupRef.current?.remove(mesh);
        disposeMesh(mesh);
      });
      rackRailsRef.current = [];
      rackStandoffsRef.current = [];
    }

    // Default camera when layout identity changes; with parent refs, same key after remount restores orbit.
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (camera && controls) {
      const layoutKey = [
        effectiveImageSize.width,
        effectiveImageSize.height,
        Number(metersPerPixel.toFixed(8)),
        panelCount ?? panelCoordinates.length,
        roofPolygon.length,
        panelCoordinates.length,
      ].join('|');

      const applyDefaultCamera = () => {
        group.updateMatrixWorld(true);
        const bbox = new THREE.Box3().setFromObject(group);
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        const size = new THREE.Vector3();
        bbox.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z, 1e-6);
        // Bird's eye: mostly above the roof (+Z), tiny XY shift so lookAt stays stable (not parallel to up).
        const lift = maxDim * 5.5;
        const shift = maxDim * 0.28;
        camera.position.set(center.x + shift, center.y + shift, center.z + lift);
        camera.lookAt(center);

        if (controlsRef.current) {
          controlsRef.current.target.copy(center);
          controlsRef.current.minDistance = maxDim * 0.8;
          controlsRef.current.maxDistance = maxDim * 8;
          controlsRef.current.maxPolarAngle = Math.PI / 2.2;
          controlsRef.current.update();
        }
        const renderer = rendererRef.current;
        const scene = sceneRef.current;
        if (renderer && scene) {
          renderer.render(scene, camera);
        }
      };

      if (persistentLayoutKeyRef) {
        const sameLayout = persistentLayoutKeyRef.current === layoutKey;
        if (!lockCameraView || !sameLayout) {
          applyDefaultCamera();
          persistentLayoutKeyRef.current = layoutKey;
          lastCameraLayoutKeyRef.current = layoutKey;
        } else if (orbitStateRef?.current) {
          const o = orbitStateRef.current;
          camera.position.set(o.position[0], o.position[1], o.position[2]);
          controls.target.set(o.target[0], o.target[1], o.target[2]);
          controls.update();
        } else {
          applyDefaultCamera();
          persistentLayoutKeyRef.current = layoutKey;
          lastCameraLayoutKeyRef.current = layoutKey;
        }
      } else {
        const layoutChanged = lastCameraLayoutKeyRef.current !== layoutKey;
        if (!lockCameraView || layoutChanged) {
          lastCameraLayoutKeyRef.current = layoutKey;
          applyDefaultCamera();
        }
      }
    }
  }, [
    effectiveImageSize,
    lockCameraView,
    metersPerPixel,
    orbitStateRef,
    panelCoordinates,
    panelCount,
    persistentLayoutKeyRef,
    roofPolygon,
    roofProceduralTexture,
    roofTexture,
    tiltDeg,
    applySunLightPositionsFromAngles,
    portraitModuleSizeM?.widthM,
    portraitModuleSizeM?.heightM,
  ]);

  // Swap satellite texture onto the roof TOP cap when it finishes loading.
  // This avoids rebuilding the whole scene and helps prevent WebGL flicker.
  useEffect(() => {
    const mesh = roofTopMeshRef.current;
    if (!mesh) return;
    const mat = mesh.material as THREE.MeshStandardMaterial;
    const nextMap = roofTexture ?? roofProceduralTexture ?? null;
    if (mat.map === nextMap) return;
    mat.map = nextMap;
    mat.needsUpdate = true;
  }, [roofTexture, roofProceduralTexture]);

  useEffect(() => {
    const panels = panelsRef.current;
    if (panels.length === 0) return;
    const tiltRad = THREE.MathUtils.degToRad(tiltDeg);
    for (const panel of panels) {
      panel.rotation.x = tiltRad;
    }

    // Update racking rails + standoffs
    const showRack = false;
    const factor = showRack
      ? Math.max(0, Math.min(1, Math.sin(tiltRad) / Math.sin(THREE.MathUtils.degToRad(45))))
      : 0;

    for (const rail of rackRailsRef.current) {
      rail.visible = showRack;
      rail.rotation.x = tiltRad;
    }

    for (const standoff of rackStandoffsRef.current) {
      const bottomY = (standoff as any).userData?.bottomRailY as number | undefined;
      const maxHeightM = (standoff as any).userData?.maxHeightM as number | undefined;
      if (!Number.isFinite(bottomY) || !Number.isFinite(maxHeightM)) continue;

      standoff.visible = showRack;
      standoff.rotation.x = tiltRad;
      const hNow = Math.max(0.0001, maxHeightM! * factor);
      standoff.scale.set(1, Math.max(0.0001, factor), 1);
      standoff.position.y = bottomY! + hNow / 2;
    }
  }, [tiltDeg]);

  useLayoutEffect(() => {
    applySunLightPositionsFromAngles(sunAzimuthDeg, sunElevationDeg);
  }, [sunAzimuthDeg, sunElevationDeg, applySunLightPositionsFromAngles]);

  const resetView = useCallback(() => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    const group = groupRef.current;
    if (!camera || !controls || !group) return;

    if (resetAnimFrameRef.current != null) {
      cancelAnimationFrame(resetAnimFrameRef.current);
      resetAnimFrameRef.current = null;
    }

    group.updateMatrixWorld(true);
    const bbox = new THREE.Box3().setFromObject(group);
    const center = new THREE.Vector3();
    bbox.getCenter(center);
    const size = new THREE.Vector3();
    bbox.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z, 1e-6);
    const lift = maxDim * 5.5;
    const shift = maxDim * 0.28;
    camera.position.set(center.x + shift, center.y + shift, center.z + lift);
    camera.lookAt(center);

    if (controlsRef.current) {
      controlsRef.current.target.copy(center);
      controlsRef.current.minDistance = maxDim * 0.8;
      controlsRef.current.maxDistance = maxDim * 8;
      controlsRef.current.maxPolarAngle = Math.PI / 2.2;
      controlsRef.current.update();
    }
  }, []);

  /** WYSIWYG: keeps current orbit/zoom; export resolution matches on-screen aspect (long edge up to 1920px). */
  const buildExportDataUrl = useCallback(async (): Promise<string> => {
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!renderer || !scene || !camera || !controls) return '';

    const oldBg = scene.background ? (scene.background as THREE.Color).clone() : null;
    const oldCamPos = camera.position.clone();
    const oldTarget = controls.target.clone();
    const oldSize = renderer.getSize(new THREE.Vector2());
    const oldPixelRatio = renderer.getPixelRatio();
    const oldAspect = camera.aspect;
    const oldNear = camera.near;
    const oldFar = camera.far;

    const sun = sunSphereRef.current;
    const oldSunVis = sun ? sun.visible : true;

    if (sun) sun.visible = false;

    let dataUrl = '';
    try {
      scene.background = new THREE.Color('#ffffff');

      const mountEl = mountRef.current;
      const vw = Math.max(64, mountEl?.clientWidth ?? 800);
      const vh = Math.max(64, mountEl?.clientHeight ?? 600);
      const viewAspect = vw / vh;
      const maxLong = 1920;
      let exportW: number;
      let exportH: number;
      if (viewAspect >= 1) {
        exportW = maxLong;
        exportH = Math.max(2, Math.round(maxLong / viewAspect));
      } else {
        exportH = maxLong;
        exportW = Math.max(2, Math.round(maxLong * viewAspect));
      }

      renderer.setPixelRatio(2);
      camera.aspect = exportW / exportH;
      camera.updateProjectionMatrix();
      renderer.setSize(exportW, exportH, false);

      const renderExportFrame = () => {
        controls.update();
        renderer.render(scene, camera);
      };
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
      renderExportFrame();
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
      renderExportFrame();

      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = exportW;
      exportCanvas.height = exportH;
      const ctx = exportCanvas.getContext('2d', { willReadFrequently: false });
      if (!ctx) {
        setExportError('Could not create canvas for export.');
      } else {
        const src = renderer.domElement;
        ctx.drawImage(src, 0, 0, src.width, src.height, 0, 0, exportW, exportH);

        const cx = exportW / 2;
        const cy = exportH / 2;
        const maxR = Math.sqrt(cx * cx + cy * cy);
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(1, 'rgba(0,0,0,0.18)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, exportW, exportH);

        const dateStr = new Date().toLocaleDateString();
        const lines = ['Rayenna', 'Solar Installation Plan', dateStr];
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
        ctx.font = '700 18px system-ui, -apple-system, Segoe UI, Roboto, Arial';
        const padding = 22;
        const baseY = exportH - padding;
        const lineGap = 22;
        lines.forEach((text, idx) => {
          const y = baseY - (lines.length - 1 - idx) * lineGap;
          ctx.fillText(text, exportW - padding, y);
        });

        try {
          dataUrl = exportCanvas.toDataURL('image/png');
        } catch (capErr: unknown) {
          if (capErr instanceof DOMException && capErr.name === 'SecurityError') {
            setExportError(
              'PNG export is blocked because the roof photo is not CORS-safe (browser security). Use a satellite image URL that allows cross-origin use, or save from a roof image hosted on your CRM/Cloudinary.',
            );
          } else {
            setExportError(capErr instanceof Error ? capErr.message : 'Could not read image from canvas.');
          }
        }
      }
    } catch (err: unknown) {
      setExportError(err instanceof Error ? err.message : 'Export failed.');
    } finally {
      if (sun) sun.visible = oldSunVis;
      camera.position.copy(oldCamPos);
      controls.target.copy(oldTarget);
      controls.update();
      camera.aspect = oldAspect;
      camera.near = oldNear;
      camera.far = oldFar;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(oldPixelRatio);
      renderer.setSize(oldSize.x, oldSize.y, false);
      scene.background = oldBg;
    }
    return dataUrl;
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      captureCurrentViewPng: async () => {
        setExportError(null);
        const url = await buildExportDataUrl();
        return url || null;
      },
    }),
    [buildExportDataUrl],
  );

  const handleExport = useCallback(async () => {
    setExportError(null);
    setExportingSnapshot(true);
    let dataUrl = '';
    try {
      dataUrl = await buildExportDataUrl();
    } finally {
      setExportingSnapshot(false);
    }

    if (!dataUrl) return;

    const stamp = new Date().toISOString().slice(0, 10);
    const baseName = `rayenna-roof-3d-${stamp}`;
    try {
      const blob = await fetch(dataUrl).then((r) => r.blob());
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objUrl;
      a.download = `${baseName}.png`;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objUrl);
    } catch {
      try {
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `${baseName}.png`;
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } catch {
        // download is best-effort; parent still receives dataUrl
      }
    }

    onExportPNG?.(dataUrl);
  }, [buildExportDataUrl, onExportPNG]);

  // Default float position: top-right of the 3D mount in viewport coords; clamp on resize / window.
  useEffect(() => {
    if (controlsPortalHost) return;
    const m = mountRef.current;
    if (!m) return;

    const fit = () => {
      const shell = controlsShellRef.current;
      const cw = m.clientWidth;
      if (cw < 32) return;
      const sw = shell?.offsetWidth || 268;
      const sh = shell?.offsetHeight || 44;
      const r = m.getBoundingClientRect();

      if (!userDraggedControlsRef.current && !controlsFloatInitRef.current) {
        controlsFloatInitRef.current = true;
        const nx = r.right - sw - 12;
        const ny = r.top + 10;
        setControlsFloat(clampFloatingControlsToViewport(nx, ny, sw, sh));
        return;
      }
      setControlsFloat((p) => clampFloatingControlsToViewport(p.x, p.y, sw, sh));
    };

    const ro = new ResizeObserver(() => requestAnimationFrame(fit));
    ro.observe(m);
    const onWin = () => requestAnimationFrame(fit);
    window.addEventListener('resize', onWin);
    requestAnimationFrame(fit);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', onWin);
    };
  }, [controlsPortalHost]);

  // Expand/collapse changes panel height — re-clamp in the viewport.
  useEffect(() => {
    if (controlsPortalHost) return;
    const m = mountRef.current;
    const shell = controlsShellRef.current;
    if (!m || !shell) return;
    const raf = requestAnimationFrame(() => {
      const sh = controlsShellRef.current;
      if (!m || !sh) return;
      const sw = sh.offsetWidth;
      const shh = sh.offsetHeight;
      setControlsFloat((p) => clampFloatingControlsToViewport(p.x, p.y, sw, shh));
    });
    return () => cancelAnimationFrame(raf);
  }, [controlsCollapsed, controlsPortalHost]);

  const onControlsDragPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('[data-collapse-control]')) return;
    if ((e.target as HTMLElement).closest('input, button, a')) return;
    userDraggedControlsRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    const pos = controlsFloatRef.current;
    controlsDragRef.current = {
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startX: pos.x,
      startY: pos.y,
    };
  }, []);

  const onControlsDragPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const d = controlsDragRef.current;
    if (!d || d.pointerId !== e.pointerId || !controlsShellRef.current) return;
    const shell = controlsShellRef.current;
    const dx = e.clientX - d.startClientX;
    const dy = e.clientY - d.startClientY;
    const nx = d.startX + dx;
    const ny = d.startY + dy;
    const c = clampFloatingControlsToViewport(nx, ny, shell.offsetWidth, shell.offsetHeight);
    setControlsFloat({ x: c.x, y: c.y });
  }, []);

  const onControlsDragPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const d = controlsDragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    controlsDragRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // already released
    }
  }, []);

  // Pulse the panel count badge when the visible panel set changes.
  useEffect(() => {
    const pulse = panelCount ?? panelCoordinates.length;
    // avoid unused var warning; pulse is only to trigger dependency evaluation
    void pulse;

    setBadgeScale(1.2);
    if (badgePulseTimeoutRef.current != null) window.clearTimeout(badgePulseTimeoutRef.current);
    badgePulseTimeoutRef.current = window.setTimeout(() => setBadgeScale(1), 300);
  }, [panelCount, panelCoordinates.length]);

  // Keyboard shortcuts: R = reset view, E = export PNG
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isTyping =
        tag === 'input' || tag === 'textarea' || (target && (target as any).isContentEditable);
      if (isTyping) return;

      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        resetView();
      }
      if (e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        void handleExport();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [resetView, handleExport]);
  return (
    <div className={fillParent ? 'w-full h-full min-h-0 flex flex-col' : 'w-full'}>
      <div
        ref={mountRef}
        className="relative w-full overflow-hidden rounded-lg bg-slate-200/80"
        style={
          fillParent
            ? { height: '100%', minHeight: 280, flex: '1 1 auto' }
            : { height: 'min(58vh, 620px)', minHeight: 320 }
        }
      >
        {!exportingSnapshot && (
          <div
            className="absolute top-2 left-2 z-[5] text-xs font-semibold text-white drop-shadow transition-transform pointer-events-none"
            style={{ transform: `scale(${badgeScale})`, transformOrigin: 'left top' }}
          >
            {panelCount ?? panelCoordinates.length} Panels
          </div>
        )}

        <canvas ref={canvasRef} className="block w-full h-full" />
        {webglUnavailable && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100/95 text-slate-700 text-sm font-medium">
            3D preview unavailable in this browser session. Please refresh and try again.
          </div>
        )}

        {exportError && (
          <div className="absolute bottom-[4.5rem] left-2 right-2 z-20 pointer-events-auto rounded-lg bg-red-950/90 text-red-50 text-[11px] leading-snug px-3 py-2 border border-red-800/80 shadow-lg flex gap-2 items-start max-h-28 overflow-y-auto">
            <span className="flex-1 min-w-0">{exportError}</span>
            <button
              type="button"
              className="shrink-0 text-red-200 hover:text-white font-semibold underline touch-manipulation"
              onClick={() => setExportError(null)}
            >
              Dismiss
            </button>
          </div>
        )}

        {!exportingSnapshot && (
        <div className="absolute bottom-4 left-4 z-[5] w-[60px] h-[60px] bg-black/35 rounded-full flex items-center justify-center pointer-events-none">
          <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true">
            <circle
              cx="28"
              cy="28"
              r="22"
              fill="rgba(0,0,0,0.0)"
              stroke="rgba(255,255,255,0.35)"
            />
            <path d="M28 6 L32 28 L28 28 L24 28 Z" fill="rgba(255,255,255,0.6)" />
            <path d="M28 50 L32 28 L28 28 L24 28 Z" fill="rgba(255,255,255,0.3)" />
            <path d="M6 28 L28 32 L28 28 L28 24 Z" fill="rgba(255,255,255,0.3)" />
            <path d="M50 28 L28 32 L28 28 L28 24 Z" fill="rgba(255,255,255,0.3)" />
            <text
              x="28"
              y="16"
              textAnchor="middle"
              fontSize="10"
              fill="rgba(255,255,255,0.85)"
              fontWeight="700"
            >
              N
            </text>
            <text
              x="28"
              y="50"
              textAnchor="middle"
              fontSize="10"
              fill="rgba(255,255,255,0.65)"
              fontWeight="700"
            >
              S
            </text>
            <text
              x="10"
              y="31"
              textAnchor="middle"
              fontSize="10"
              fill="rgba(255,255,255,0.65)"
              fontWeight="700"
            >
              W
            </text>
            <text
              x="46"
              y="31"
              textAnchor="middle"
              fontSize="10"
              fill="rgba(255,255,255,0.65)"
              fontWeight="700"
            >
              E
            </text>
          </svg>
        </div>
        )}
        {!isDockedControls &&
          typeof document !== 'undefined' &&
          createPortal(
            <div
              ref={controlsShellRef}
              className="fixed z-[100] pointer-events-auto w-[min(288px,calc(100vw-24px))] max-w-[min(288px,calc(100vw-24px))] rounded-xl shadow-2xl shadow-black/45 ring-1 ring-white/10"
              style={{ left: controlsFloat.x, top: controlsFloat.y }}
            >
            <div className="bg-black/55 text-white rounded-xl text-xs border border-white/10 backdrop-blur-md overflow-hidden">
              <div
                className="flex items-stretch gap-1 px-2 py-1.5 select-none touch-none"
                role="toolbar"
                aria-label="3D view controls"
                title="Drag header to move. Use + or − to show or hide sliders."
              >
                <div
                  className="flex flex-1 items-center gap-2 min-w-0 cursor-grab active:cursor-grabbing rounded-lg px-1 py-1"
                  onPointerDown={onControlsDragPointerDown}
                  onPointerMove={onControlsDragPointerMove}
                  onPointerUp={onControlsDragPointerUp}
                  onPointerCancel={onControlsDragPointerUp}
                >
                  <span className="shrink-0 text-white/40" aria-hidden>
                    <svg width="12" height="16" viewBox="0 0 12 16">
                      <circle cx="3" cy="3" r="1.4" fill="currentColor" />
                      <circle cx="9" cy="3" r="1.4" fill="currentColor" />
                      <circle cx="3" cy="8" r="1.4" fill="currentColor" />
                      <circle cx="9" cy="8" r="1.4" fill="currentColor" />
                      <circle cx="3" cy="13" r="1.4" fill="currentColor" />
                      <circle cx="9" cy="13" r="1.4" fill="currentColor" />
                    </svg>
                  </span>
                  <div className="text-sm font-semibold text-white/90 truncate">
                    ☀️ {panelCount ?? panelCoordinates.length} Panels
                  </div>
                </div>
                <button
                  type="button"
                  data-collapse-control
                  className="shrink-0 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-lg font-bold text-white/90 hover:bg-white/10 touch-manipulation"
                  onClick={() => setControlsCollapsed((v) => !v)}
                  aria-expanded={!controlsCollapsed}
                  aria-label={controlsCollapsed ? 'Expand controls' : 'Collapse controls'}
                >
                  {controlsCollapsed ? '+' : '−'}
                </button>
              </div>

              {!controlsCollapsed && (
                <div className="px-4 pb-4 space-y-3">
                  <div className="h-px bg-white/10" />

                  <label className="flex items-start gap-2.5 cursor-pointer select-none touch-manipulation">
                    <input
                      type="checkbox"
                      className="mt-0.5 rounded border-white/30 accent-[#22c55e]"
                      checked={lockCameraView}
                      onChange={(e) => setLockCameraView(e.target.checked)}
                      aria-describedby="solar3d-lock-camera-hint"
                    />
                    <span className="min-w-0">
                      <span className="block text-white/90 font-medium">Keep camera position</span>
                      <span id="solar3d-lock-camera-hint" className="block text-white/55 text-[11px] leading-snug mt-0.5">
                        Orbit view stays when you change tilt, sun, or page zoom. Turn off to snap to default framing on each
                        scene rebuild.
                      </span>
                    </span>
                  </label>

                  {layoutDragEnabled && (
                    <p className="rounded-lg border border-emerald-400/30 bg-emerald-500/15 px-2.5 py-2 text-[11px] leading-snug text-emerald-100">
                      {layoutDragging
                        ? layoutGestureMode === 'rotate'
                          ? 'Rotating array… release to place.'
                          : 'Moving array… release to place.'
                        : 'Drag pad to move · green knob to rotate · two-finger twist on phone · double-tap flips Portrait/Landscape.'}
                    </p>
                  )}

                  <div className="flex items-center justify-between gap-3">
                    <label className="whitespace-nowrap text-white/90">Panel Tilt</label>
                    <span className="w-14 text-right tabular-nums font-semibold">{tiltDeg}°</span>
                  </div>
                  <input
                    className="accent-[#22c55e] w-full min-h-[44px] sm:min-h-0"
                    type="range"
                    min={0}
                    max={45}
                    value={tiltDeg}
                    onInput={(e) => setTiltDeg(Number((e.target as HTMLInputElement).value))}
                    onChange={(e) => setTiltDeg(Number(e.target.value))}
                  />

                  <div className="flex items-center justify-between gap-3">
                    <label className="whitespace-nowrap text-white/90">Sun Elevation</label>
                    <span className="w-14 text-right tabular-nums font-semibold">
                      {sunElevationDeg}°
                    </span>
                  </div>
                  <input
                    className="accent-[#22c55e] w-full min-h-[44px] sm:min-h-0"
                    type="range"
                    min={10}
                    max={80}
                    value={sunElevationDeg}
                    onInput={(e) => setSunElevationDeg(Number((e.target as HTMLInputElement).value))}
                    onChange={(e) => setSunElevationDeg(Number(e.target.value))}
                  />

                  <div className="flex items-center justify-between gap-3">
                    <label className="whitespace-nowrap text-white/90">Sun Azimuth</label>
                    <span className="w-14 text-right tabular-nums font-semibold">{sunAzimuthDeg}°</span>
                  </div>
                  <input
                    className="accent-[#22c55e] w-full min-h-[44px] sm:min-h-0"
                    type="range"
                    min={0}
                    max={360}
                    value={sunAzimuthDeg}
                    onInput={(e) => setSunAzimuthDeg(Number((e.target as HTMLInputElement).value))}
                    onChange={(e) => setSunAzimuthDeg(Number(e.target.value))}
                  />

                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      className="flex-1 min-h-[44px] bg-[#22c55e] hover:bg-[#1fb45a] text-white rounded-lg px-3 py-2 font-semibold touch-manipulation"
                      onClick={() => void handleExport()}
                    >
                      Export PNG
                    </button>
                    <button
                      type="button"
                      className="min-h-[44px] bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-lg px-3 py-2 font-semibold touch-manipulation"
                      onClick={resetView}
                      aria-label="Reset view (R)"
                      title="Reset view (R)"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>,
            document.body,
          )}
      </div>

      {isDockedControls &&
        controlsPortalHost &&
        createPortal(
          <div ref={controlsShellRef} className="w-full max-w-full pointer-events-auto">
            <div className="rounded-xl border border-gray-200 bg-white text-gray-800 text-xs shadow-sm overflow-hidden">
              <div
                className="flex items-stretch gap-1 px-3 py-2 bg-slate-50 border-b border-gray-200"
                role="toolbar"
                aria-label="3D scene controls"
              >
                <div className="flex flex-1 items-center gap-2 min-w-0">
                  <span className="text-base" aria-hidden>
                    ☀️
                  </span>
                  <div className="text-sm font-semibold text-gray-800 truncate">
                    {panelCount ?? panelCoordinates.length} panels · 3D scene
                  </div>
                </div>
                <button
                  type="button"
                  data-collapse-control
                  className="shrink-0 min-h-[44px] min-w-[44px] sm:min-h-[40px] sm:min-w-[40px] flex items-center justify-center rounded-lg text-lg font-bold text-gray-700 hover:bg-gray-100 touch-manipulation"
                  onClick={() => setControlsCollapsed((v) => !v)}
                  aria-expanded={!controlsCollapsed}
                  aria-label={controlsCollapsed ? 'Expand 3D controls' : 'Collapse 3D controls'}
                >
                  {controlsCollapsed ? '+' : '−'}
                </button>
              </div>

              {!controlsCollapsed && (
                <div className="px-3 sm:px-4 pb-4 pt-3 space-y-3">
                  <label className="flex items-start gap-2.5 cursor-pointer select-none touch-manipulation">
                    <input
                      type="checkbox"
                      className="mt-0.5 rounded border-gray-300 accent-indigo-600"
                      checked={lockCameraView}
                      onChange={(e) => setLockCameraView(e.target.checked)}
                      aria-describedby="solar3d-lock-camera-hint-dock"
                    />
                    <span className="min-w-0">
                      <span className="block text-gray-800 font-medium text-sm">Keep camera position</span>
                      <span id="solar3d-lock-camera-hint-dock" className="block text-gray-500 text-[11px] leading-snug mt-0.5">
                        Orbit view stays when you change tilt, sun, or page zoom. Turn off to snap to default framing when the
                        scene rebuilds.
                      </span>
                    </span>
                  </label>

                  {layoutDragEnabled && (
                    <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-[11px] leading-snug text-emerald-900">
                      {layoutDragging
                        ? layoutGestureMode === 'rotate'
                          ? 'Rotating array… release to place.'
                          : 'Moving array… release to place.'
                        : 'Drag pad to move · green knob to rotate · two-finger twist · double-tap flips Portrait/Landscape. On phone, use Move panels first.'}
                    </p>
                  )}

                  <div className="flex items-center justify-between gap-3">
                    <label className="whitespace-nowrap text-gray-700 font-medium">Panel tilt</label>
                    <span className="w-14 text-right tabular-nums font-semibold text-gray-900">{tiltDeg}°</span>
                  </div>
                  <input
                    className="accent-indigo-600 w-full min-h-[44px] sm:min-h-0"
                    type="range"
                    min={0}
                    max={45}
                    value={tiltDeg}
                    onInput={(e) => setTiltDeg(Number((e.target as HTMLInputElement).value))}
                    onChange={(e) => setTiltDeg(Number(e.target.value))}
                  />

                  <div className="flex items-center justify-between gap-3">
                    <label className="whitespace-nowrap text-gray-700 font-medium">Sun elevation</label>
                    <span className="w-14 text-right tabular-nums font-semibold text-gray-900">
                      {sunElevationDeg}°
                    </span>
                  </div>
                  <input
                    className="accent-indigo-600 w-full min-h-[44px] sm:min-h-0"
                    type="range"
                    min={10}
                    max={80}
                    value={sunElevationDeg}
                    onInput={(e) => setSunElevationDeg(Number((e.target as HTMLInputElement).value))}
                    onChange={(e) => setSunElevationDeg(Number(e.target.value))}
                  />

                  <div className="flex items-center justify-between gap-3">
                    <label className="whitespace-nowrap text-gray-700 font-medium">Sun azimuth</label>
                    <span className="w-14 text-right tabular-nums font-semibold text-gray-900">{sunAzimuthDeg}°</span>
                  </div>
                  <input
                    className="accent-indigo-600 w-full min-h-[44px] sm:min-h-0"
                    type="range"
                    min={0}
                    max={360}
                    value={sunAzimuthDeg}
                    onInput={(e) => setSunAzimuthDeg(Number((e.target as HTMLInputElement).value))}
                    onChange={(e) => setSunAzimuthDeg(Number(e.target.value))}
                  />

                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <button
                      type="button"
                      className="flex-1 min-h-[44px] bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-3 py-2 font-semibold touch-manipulation"
                      onClick={() => void handleExport()}
                    >
                      Export PNG
                    </button>
                    <button
                      type="button"
                      className="min-h-[44px] bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-lg px-3 py-2 font-semibold touch-manipulation"
                      onClick={resetView}
                      aria-label="Reset view (R)"
                      title="Reset view (R)"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>,
          controlsPortalHost,
        )}
    </div>
  );
});

export default Solar3DView;
