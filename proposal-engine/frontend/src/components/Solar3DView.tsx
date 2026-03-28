import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { PMREMGenerator } from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
// OrbitControls is shipped by `three`, but this repo does not have type declarations for the examples import.
// We only use it at runtime, so we suppress the compile-time module/type error.
// @ts-expect-error - missing types for three/examples module in this project
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import {
  createSolarPanelTexture,
  PANEL_MESH_THICKNESS_M,
  panelToMesh,
  polygonToShape,
  type Solar3DPanel,
} from '../lib/solar3DHelpers';

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
}

const roofDepthM = 0.6; // visible slab thickness for rooftop realism

export default function Solar3DView({
  roofPolygon,
  panelCoordinates,
  imageSize,
  roofImageUrl,
  metersPerPixel,
  panelCount,
  onExportPNG,
}: Solar3DViewProps) {
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
  const gridRef = useRef<THREE.GridHelper | null>(null);
  const groundPlaneRef = useRef<THREE.Mesh | null>(null);
  const groundGridRef = useRef<THREE.GridHelper | null>(null);
  const rackRailsRef = useRef<THREE.Mesh[]>([]);
  const rackStandoffsRef = useRef<THREE.Mesh[]>([]);
  const hasInitialFrameRef = useRef(false);
  const controlsRef = useRef<OrbitControls | null>(null);
  const tiltDegRef = useRef(10);
  const roofCenterRef = useRef<THREE.Vector3 | null>(null);
  const satellitePlaneRef = useRef<THREE.Mesh | null>(null);
  const revealStartTimeRef = useRef<number | null>(null);
  const revealFromRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 20, 0));
  const revealToRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 12, 10));
  const revealFinishedRef = useRef(false);
  const environmentMapRef = useRef<THREE.Texture | null>(null);

  const [tiltDeg, setTiltDeg] = useState(10);
  const [sunElevationDeg, setSunElevationDeg] = useState(45);
  const [sunAzimuthDeg, setSunAzimuthDeg] = useState(180);
  const [webglUnavailable, setWebglUnavailable] = useState(false);

  const [badgeScale, setBadgeScale] = useState(1);
  const resetAnimFrameRef = useRef<number | null>(null);
  const badgePulseTimeoutRef = useRef<number | null>(null);

  // Minimized by default so it never blocks the roof view.
  const [controlsCollapsed, setControlsCollapsed] = useState(true);
  /** Top-left offset inside the 3D mount (px); default placed top-right after layout. */
  const [controlsFloat, setControlsFloat] = useState({ x: 12, y: 12 });
  const controlsShellRef = useRef<HTMLDivElement | null>(null);
  const controlsFloatInitRef = useRef(false);
  const userDraggedControlsRef = useRef(false);
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

  // Important for satellite UV mapping: use the full original image size,
  // otherwise the roof UVs won't line up with the texture loaded from `roofImageUrl`.
  const effectiveImageSize = useMemo(() => imageSize, [imageSize]);

  useEffect(() => {
    if (!import.meta.env?.DEV) return;
    // Step 2 diagnostics: confirm panelCoordinates are present.
    console.log('[Solar3DView] metersPerPixel:', metersPerPixel);
    console.log('[Solar3DView] panelCoordinates.length:', panelCoordinates?.length);
    console.log('[Solar3DView] panelCount (ideal):', panelCount);
    console.log('[Solar3DView] panelCoordinates sample:', panelCoordinates?.[0]);
  }, []);

  useEffect(() => {
    if (!mountRef.current || !canvasRef.current) return;

    const mountEl = mountRef.current;
    const canvasEl = canvasRef.current;

    const width = Math.max(1, mountEl.clientWidth);
    const height = Math.max(1, mountEl.clientHeight);

    const scene = new THREE.Scene();
    scene.background = null;
    // Soft sky (interactive view only; export path temporarily forces white).
    scene.background = new THREE.Color('#d8e8f4');
    // Use Z-up to match how roof/panel geometry is built.
    scene.up = new THREE.Vector3(0, 0, 1);

    const camera = new THREE.PerspectiveCamera(
      45,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000,
    );
    camera.position.set(0, 20, 20);
    camera.lookAt(0, 0, 0);

    let renderer: THREE.WebGLRenderer | null = null;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
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
    renderer.setSize(width, height, false);
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
    controls.maxPolarAngle = Math.PI;
    controls.minDistance = 3;
    controls.maxDistance = 40;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = true;
    controls.enableZoom = true;
    controls.zoomSpeed = 1.1;
    controls.target.set(0, 0, 0);

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

    const resizeObserver = new ResizeObserver(() => {
      const w = Math.max(1, mountEl.clientWidth);
      const h = Math.max(1, mountEl.clientHeight);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
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

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      resizeObserver.disconnect();

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
  }, []);

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

    const roofShape = polygonToShape(roofPolygon, effectiveImageSize, metersPerPixel);
    // 1) Satellite image as a flat base plane (NOT mapped to the polygon).
    const imgWm = effectiveImageSize.width * metersPerPixel;
    const imgHm = effectiveImageSize.height * metersPerPixel;
    const baseTex = roofTexture ?? roofProceduralTexture ?? null;
    if (baseTex) {
      // With Y flipped in geometry conversion, keep base texture oriented naturally.
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

    // 2) Roof polygon slab placed above the satellite plane.
    const roofBaseZ = 2; // meters above the satellite plane
    const roofSidesGeometry = new THREE.ExtrudeGeometry(roofShape, {
      depth: roofDepthM,
      bevelEnabled: false,
    });
    roofSidesGeometry.translate(0, 0, roofBaseZ);

    const roofSidesMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b7355,
      roughness: 0.88,
      metalness: 0.06,
      envMapIntensity: 0.75,
    });
    // Ensure the roof remains visible regardless of current camera angle.
    roofSidesMaterial.side = THREE.DoubleSide;

    const roofSidesMesh = new THREE.Mesh(roofSidesGeometry, roofSidesMaterial);
    roofSidesMesh.castShadow = true;
    roofSidesMesh.receiveShadow = true;
    group.add(roofSidesMesh);
    roofSidesMeshRef.current = roofSidesMesh;

    // Roof sides remain aligned with the Z-up geometry (no additional rotation).

    // Subtle roof outline for a more professional look.
    const roofEdges = new THREE.EdgesGeometry(roofSidesGeometry);
    const roofEdgeLines = new THREE.LineSegments(
      roofEdges,
      new THREE.LineBasicMaterial({ color: 0x333333 }),
    );
    roofSidesMesh.add(roofEdgeLines);

    // Roof TOP surface: simple cap (no satellite mapping).
    const roofTopGeometry = new THREE.ShapeGeometry(roofShape);
    const roofTopZ = roofBaseZ + roofDepthM + 0.01;
    roofTopGeometry.translate(0, 0, roofTopZ);

    if (roofProceduralTexture) {
      const posAttr = roofTopGeometry.attributes.position as THREE.BufferAttribute;

      // Compute UV normalization from the actual geometry vertices.
      // This is more robust than re-deriving min/max from `roofPolygon`.
      let minXM = Infinity;
      let maxXM = -Infinity;
      let minYM = Infinity;
      let maxYM = -Infinity;

      for (let i = 0; i < posAttr.count; i++) {
        const x = posAttr.getX(i);
        const y = posAttr.getY(i);
        if (x < minXM) minXM = x;
        if (x > maxXM) maxXM = x;
        if (y < minYM) minYM = y;
        if (y > maxYM) maxYM = y;
      }

      const denomX = Math.max(1e-9, maxXM - minXM);
      const denomY = Math.max(1e-9, maxYM - minYM);

      const uvs = new Float32Array(posAttr.count * 2);
      for (let i = 0; i < posAttr.count; i++) {
        const x = posAttr.getX(i);
        const y = posAttr.getY(i);
        const u = (x - minXM) / denomX;
        const vRaw = (y - minYM) / denomY;
        uvs[i * 2] = u;
        // No manual V-flip: texture upload conventions already align orientation.
        uvs[i * 2 + 1] = 1 - vRaw;
      }
      roofTopGeometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    }

    const roofTopMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.9,
      metalness: 0.02,
      transparent: true,
      opacity: 0.12,
    });
    roofTopMaterial.side = THREE.DoubleSide;

    const roofTopMesh = new THREE.Mesh(roofTopGeometry, roofTopMaterial);
    roofTopMesh.castShadow = false;
    roofTopMesh.receiveShadow = true;
    group.add(roofTopMesh);
    roofTopMeshRef.current = roofTopMesh;

    const roofBoxAligned = new THREE.Box3().setFromObject(roofSidesMesh);
    const roofCenterAligned = roofBoxAligned.getCenter(new THREE.Vector3());
    roofCenterRef.current = roofCenterAligned;

    // Keep light focus and sun marker aligned to the current roof.
    if (directionalLightRef.current) {
      directionalLightRef.current.target.position.copy(roofCenterAligned);
    }
    if (directionalLightBackRef.current) {
      directionalLightBackRef.current.target.position.copy(roofCenterAligned);
    }
    if (sunSphereRef.current && directionalLightRef.current) {
      sunSphereRef.current.position.copy(directionalLightRef.current.position);
    }

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
    const roofRadius = Math.max(roofSize.x, roofSize.y, roofSize.z, 1e-6);
    const shadowHalf = roofRadius * 0.9;
    directionalLight.shadow.camera.left = roofCenterAligned.x - shadowHalf;
    directionalLight.shadow.camera.right = roofCenterAligned.x + shadowHalf;
    directionalLight.shadow.camera.top = roofCenterAligned.y + shadowHalf;
    directionalLight.shadow.camera.bottom = roofCenterAligned.y - shadowHalf;
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 120;

    // Panels
    for (const old of panelsRef.current) {
      group.remove(old);
      disposeMesh(old);
    }
    const panels: THREE.Mesh[] = [];
    const tiltNow = tiltDegRef.current;
    const tiltNowRad = THREE.MathUtils.degToRad(tiltNow);
    const desiredPanelCount =
      panelCount != null ? Math.max(0, Math.floor(panelCount)) : panelCoordinates.length;
    const candidatePanels =
      desiredPanelCount < panelCoordinates.length
        ? panelCoordinates.slice(0, desiredPanelCount)
        : panelCoordinates;

    // Render the same count the 2D layout expects.
    // (We intentionally do not clip by corners here; corner-clipping was causing
    // fewer visible panels than the calculated ideal.)
    const panelsToRender = candidatePanels;

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
      // Place panels ON TOP of the roof.
      // Panel center sits on top of the roof cap surface.
      mesh.position.z = roofBaseZ + roofDepthM + PANEL_MESH_THICKNESS_M / 2 + 0.02;
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      group.add(mesh);
      panels.push(mesh);
    }
    panelsRef.current = panels;

    // Create simplified racking rails + standoffs (replaces per-panel spike cylinders).
    if (rackGroupRef.current) {
      // Remove any previous rack meshes.
      rackGroupRef.current.children.slice().forEach((child) => {
        const mesh = child as unknown as THREE.Mesh;
        rackGroupRef.current?.remove(mesh);
        disposeMesh(mesh);
      });
      rackRailsRef.current = [];
      rackStandoffsRef.current = [];

      // Disable rack overlays for now: they produce distracting edge artifacts in proposal view.
      const showRackNow = false;
      const baseZ = roofDepthM / 2 + PANEL_MESH_THICKNESS_M / 2 + 0.001;
        const railThicknessM = 0.04;
        const railDepthM = 0.04;
        const aluminumColor = 0xaaaaaa;

        type PanelInst = {
          centerX: number;
          centerY: number;
          widthM: number;
          heightM: number;
        };

        const panelInsts: PanelInst[] = panelsToRender.map((p) => {
          const centerX =
            (p.x + p.width / 2 - effectiveImageSize.width / 2) * metersPerPixel;
          const centerY =
            (p.y + p.height / 2 - effectiveImageSize.height / 2) * metersPerPixel;
          // Keep rack sizing consistent with actual 3D panel mesh dimensions.
          const isPortrait = p.width <= p.height;
          const panelWidthM = isPortrait ? 1.0 : 1.65;
          const panelHeightM = isPortrait ? 1.65 : 1.0;
          return {
            centerX,
            centerY,
            widthM: panelWidthM,
            heightM: panelHeightM,
          };
        });

        // Group into rows using quantized Y-center (in meters).
        const rowMap = new Map<number, PanelInst[]>();
        for (const inst of panelInsts) {
          const key = Math.round(inst.centerY * 2) / 2; // ~0.5m bins
          const list = rowMap.get(key) ?? [];
          list.push(inst);
          rowMap.set(key, list);
        }

        const factor = Math.max(
          0,
          Math.min(1, Math.sin(tiltNowRad) / Math.sin(THREE.MathUtils.degToRad(45))),
        );

        const railMaterial = new THREE.MeshStandardMaterial({
          color: aluminumColor,
          roughness: 0.9,
          metalness: 0.2,
        });
        const standoffMaterial = railMaterial;
        const standoffRadius = 0.02;

        for (const rowPanels of rowMap.values()) {
          if (rowPanels.length < 2) continue;
          rowPanels.sort((a, b) => a.centerX - b.centerX);

          const minX = rowPanels[0]!.centerX;
          const maxX = rowPanels[rowPanels.length - 1]!.centerX;
          const widthM = rowPanels[0]!.widthM;
          // Slight inset so rails do not visually protrude beyond panel edges.
          const rowWidth = Math.max(0.2, (maxX - minX) + widthM - 0.08);
          const rowCenterX = (minX + maxX) / 2;

          const heightM = rowPanels[0]!.heightM;
          const centerY = rowPanels[0]!.centerY;
          const bottomRailY = centerY - heightM / 2;
          const topRailY = centerY + heightM / 2;

          const bottomRail = new THREE.Mesh(
            new THREE.BoxGeometry(rowWidth, railThicknessM, railDepthM),
            railMaterial,
          );
          bottomRail.position.set(rowCenterX, bottomRailY, baseZ);
          bottomRail.rotation.x = tiltNowRad;
          bottomRail.visible = showRackNow;

          const topRail = new THREE.Mesh(
            new THREE.BoxGeometry(rowWidth, railThicknessM, railDepthM),
            railMaterial,
          );
          topRail.position.set(rowCenterX, topRailY, baseZ);
          topRail.rotation.x = tiltNowRad;
          topRail.visible = showRackNow;

          rackGroupRef.current.add(bottomRail);
          rackGroupRef.current.add(topRail);
          rackRailsRef.current.push(bottomRail, topRail);

          // Standoffs at every 2 panels.
          const maxHeightM = Math.min(0.2, Math.max(0.03, heightM * 0.08));
          for (let i = 0; i < rowPanels.length; i += 2) {
            const x = rowPanels[i]!.centerX;

            const standoff = new THREE.Mesh(
              new THREE.CylinderGeometry(standoffRadius, standoffRadius, maxHeightM, 10),
              standoffMaterial,
            );
            standoff.rotation.x = tiltNowRad;
            standoff.visible = showRackNow;

            standoff.userData.bottomRailY = bottomRailY;
            standoff.userData.maxHeightM = maxHeightM;

            const hNow = Math.max(0.0001, maxHeightM * factor);
            standoff.scale.set(1, Math.max(0.0001, factor), 1);
            standoff.position.set(x, bottomRailY + hNow / 2, baseZ);

            rackGroupRef.current.add(standoff);
            rackStandoffsRef.current.push(standoff);
          }
        }
    }

    // Fixed camera + target for a stable, realistic view.
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (camera && controls) {
      camera.position.set(200, -200, 150);
      camera.lookAt(0, 0, 0);
      controls.target.set(0, 0, 0);
      controls.update();
    }
  }, [
    effectiveImageSize,
    metersPerPixel,
    panelCoordinates,
    panelCount,
    roofPolygon,
    roofProceduralTexture,
    roofTexture,
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

  useEffect(() => {
    const directionalLight = directionalLightRef.current;
    const directionalLightBack = directionalLightBackRef.current;
    if (!directionalLight) return;

    const roofCenter = roofCenterRef.current ?? new THREE.Vector3(0, 0, 0);
    const azRad = THREE.MathUtils.degToRad(sunAzimuthDeg);
    const elRad = THREE.MathUtils.degToRad(sunElevationDeg);

    // With Z-up, z is derived from elevation, and x/y are derived from azimuth in the XY plane.
    const x = Math.cos(elRad) * Math.sin(azRad) * 15;
    const y = Math.cos(elRad) * Math.cos(azRad) * 15;
    const z = Math.sin(elRad) * 15;

    directionalLight.position.set(x, y, z);
    directionalLight.target.position.copy(roofCenter);

    if (directionalLightBack) {
      directionalLightBack.position.set(-x, -y, z);
      directionalLightBack.target.position.copy(roofCenter);
    }

    if (sunSphereRef.current) {
      sunSphereRef.current.position.copy(directionalLight.position);
    }
  }, [sunElevationDeg, sunAzimuthDeg]);

  const resetView = useCallback(() => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    const roofCenter = roofCenterRef.current;
    if (!camera || !controls || !roofCenter) return;

    if (resetAnimFrameRef.current != null) {
      cancelAnimationFrame(resetAnimFrameRef.current);
    }

    const durationMs = 500;
    const start = camera.position.clone();
    // With Z-up, "height" is on Z.
    const end = new THREE.Vector3(roofCenter.x + 0, roofCenter.y - 5, roofCenter.z + 8);
    const startTime = performance.now();

    controls.target.copy(roofCenter);
    controls.update();

    const animate = () => {
      const now = performance.now();
      const t = Math.min(1, (now - startTime) / durationMs);
      camera.position.lerpVectors(start, end, t);
      controls.update();

      if (t < 1) {
        resetAnimFrameRef.current = requestAnimationFrame(animate);
      } else {
        resetAnimFrameRef.current = null;
      }
    };

    resetAnimFrameRef.current = requestAnimationFrame(animate);
  }, []);

  // Default float position: top-right inside mount; clamp on resize. After user drags, only clamp.
  useEffect(() => {
    const m = mountRef.current;
    if (!m) return;

    const fit = () => {
      const shell = controlsShellRef.current;
      const cw = m.clientWidth;
      const ch = m.clientHeight;
      if (cw < 32) return;
      const sw = shell?.offsetWidth || 268;
      const sh = shell?.offsetHeight || 44;

      if (!userDraggedControlsRef.current && !controlsFloatInitRef.current) {
        controlsFloatInitRef.current = true;
        setControlsFloat({
          x: Math.max(0, cw - sw - 12),
          y: 10,
        });
        return;
      }
      const maxX = Math.max(0, cw - sw);
      const maxY = Math.max(0, ch - sh);
      setControlsFloat((p) => ({
        x: Math.max(0, Math.min(p.x, maxX)),
        y: Math.max(0, Math.min(p.y, maxY)),
      }));
    };

    const ro = new ResizeObserver(() => requestAnimationFrame(fit));
    ro.observe(m);
    requestAnimationFrame(fit);
    return () => ro.disconnect();
  }, []);

  // Expand/collapse changes panel height — keep it inside the viewport.
  useEffect(() => {
    const m = mountRef.current;
    const shell = controlsShellRef.current;
    if (!m || !shell) return;
    const raf = requestAnimationFrame(() => {
      const sh = controlsShellRef.current;
      if (!m || !sh) return;
      const maxX = Math.max(0, m.clientWidth - sh.offsetWidth);
      const maxY = Math.max(0, m.clientHeight - sh.offsetHeight);
      setControlsFloat((p) => ({
        x: Math.max(0, Math.min(p.x, maxX)),
        y: Math.max(0, Math.min(p.y, maxY)),
      }));
    });
    return () => cancelAnimationFrame(raf);
  }, [controlsCollapsed]);

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
    if (!d || d.pointerId !== e.pointerId || !mountRef.current || !controlsShellRef.current) return;
    const mountEl = mountRef.current;
    const shell = controlsShellRef.current;
    const dx = e.clientX - d.startClientX;
    const dy = e.clientY - d.startClientY;
    let nx = d.startX + dx;
    let ny = d.startY + dy;
    const maxX = Math.max(0, mountEl.clientWidth - shell.offsetWidth);
    const maxY = Math.max(0, mountEl.clientHeight - shell.offsetHeight);
    nx = Math.max(0, Math.min(nx, maxX));
    ny = Math.max(0, Math.min(ny, maxY));
    setControlsFloat({ x: nx, y: ny });
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
  }, [resetView]);

  async function handleExport() {
    if (!onExportPNG) return;
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!renderer || !scene || !camera || !controls) return;

    const roofCenter = roofCenterRef.current ?? new THREE.Vector3(0, 0, 0);

    const oldBg = scene.background ? (scene.background as THREE.Color).clone() : null;
    const oldCamPos = camera.position.clone();
    const oldTarget = controls.target.clone();
    const oldSize = renderer.getSize(new THREE.Vector2());
    const oldPixelRatio = renderer.getPixelRatio();
    const oldAspect = camera.aspect;

    // Proposal-ready export angle and framing.
    camera.position.set(roofCenter.x + 0, roofCenter.y - 5, roofCenter.z + 10);
    controls.target.copy(roofCenter);
    controls.update();

    // Render on white background for cleaner proposal embedding.
    scene.background = new THREE.Color('#ffffff');

    // Render at higher pixel ratio, then downscale to 1600x900.
    const exportW = 1600;
    const exportH = 900;
    renderer.setPixelRatio(2);
    camera.aspect = exportW / exportH;
    camera.updateProjectionMatrix();
    renderer.setSize(exportW, exportH, false);

    renderer.render(scene, camera);

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = exportW;
    exportCanvas.height = exportH;
    const ctx = exportCanvas.getContext('2d');

    if (ctx) {
      ctx.drawImage(renderer.domElement, 0, 0, exportW, exportH);

      // Subtle vignette.
      const cx = exportW / 2;
      const cy = exportH / 2;
      const maxR = Math.sqrt(cx * cx + cy * cy);
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, 'rgba(0,0,0,0.22)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, exportW, exportH);

      // Watermark (bottom-right).
      const dateStr = new Date().toLocaleDateString();
      const lines = ['Rayenna', 'Solar Installation Plan', dateStr];
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
      ctx.font = '700 18px system-ui, -apple-system, Segoe UI, Roboto, Arial';
      const padding = 22;
      // Stagger lines.
      const baseY = exportH - padding;
      const lineGap = 22;
      ctx.font = '700 18px system-ui, -apple-system, Segoe UI, Roboto, Arial';
      lines.forEach((text, idx) => {
        const y = baseY - (lines.length - 1 - idx) * lineGap;
        ctx.fillText(text, exportW - padding, y);
      });
    }

    const dataUrl = exportCanvas.toDataURL('image/png');

    // Restore previous interactive state.
    camera.position.copy(oldCamPos);
    controls.target.copy(oldTarget);
    controls.update();
    camera.aspect = oldAspect;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(oldPixelRatio);
    renderer.setSize(oldSize.x, oldSize.y, false);
    scene.background = oldBg;

    onExportPNG(dataUrl);
  }

  // Note: Export wiring is implemented later (Step 4) when the parent/tab integration provides the data flow.
  return (
    <div className="w-full">
      <div
        ref={mountRef}
        className="relative w-full overflow-hidden"
        style={{ height: 440 }}
      >
        <div
          className="absolute top-2 left-2 text-xs font-semibold text-white drop-shadow transition-transform"
          style={{ transform: `scale(${badgeScale})`, transformOrigin: 'left top' }}
        >
          {panelCount ?? panelCoordinates.length} Panels
        </div>

        <canvas ref={canvasRef} className="block w-full h-full" />
        {webglUnavailable && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100/95 text-slate-700 text-sm font-medium">
            3D preview unavailable in this browser session. Please refresh and try again.
          </div>
        )}

        <div className="absolute bottom-4 left-4 w-[60px] h-[60px] bg-black/35 rounded-full flex items-center justify-center pointer-events-none">
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
        {/* Draggable floating controls (collapsed by default; drag header, +/− toggles body) */}
        <div
          ref={controlsShellRef}
          className="absolute z-10 pointer-events-auto w-[min(288px,calc(100%-16px))] max-w-[calc(100%-16px)] rounded-xl shadow-2xl shadow-black/45 ring-1 ring-white/10"
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

                <div className="flex items-center justify-between gap-3">
                  <label className="whitespace-nowrap text-white/90">Panel Tilt</label>
                  <span className="w-14 text-right tabular-nums font-semibold">{tiltDeg}°</span>
                </div>
                <input
                  className="accent-[#22c55e] w-full"
                  type="range"
                  min={0}
                  max={45}
                  value={tiltDeg}
                  onChange={(e) => setTiltDeg(Number(e.target.value))}
                />

                <div className="flex items-center justify-between gap-3">
                  <label className="whitespace-nowrap text-white/90">Sun Elevation</label>
                  <span className="w-14 text-right tabular-nums font-semibold">
                    {sunElevationDeg}°
                  </span>
                </div>
                <input
                  className="accent-[#22c55e] w-full"
                  type="range"
                  min={10}
                  max={80}
                  value={sunElevationDeg}
                  onChange={(e) => setSunElevationDeg(Number(e.target.value))}
                />

                <div className="flex items-center justify-between gap-3">
                  <label className="whitespace-nowrap text-white/90">Sun Azimuth</label>
                  <span className="w-14 text-right tabular-nums font-semibold">{sunAzimuthDeg}°</span>
                </div>
                <input
                  className="accent-[#22c55e] w-full"
                  type="range"
                  min={0}
                  max={360}
                  value={sunAzimuthDeg}
                  onChange={(e) => setSunAzimuthDeg(Number(e.target.value))}
                />

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="flex-1 bg-[#22c55e] hover:bg-[#1fb45a] text-white rounded-lg px-3 py-2 font-semibold"
                    onClick={() => void handleExport()}
                  >
                    Export PNG
                  </button>
                  <button
                    type="button"
                    className="bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-lg px-3 py-2 font-semibold"
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
        </div>
      </div>
    </div>
  );
}

