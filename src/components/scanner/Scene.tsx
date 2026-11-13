import { Suspense, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useCursor } from "@react-three/drei";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import * as THREE from "three";
import { HoloBody, createHoloMaterial } from "./HoloBody";
import { MarsEnvironment, HORIZON_COLOR } from "./MarsEnvironment";
import { Organs } from "./Organs";
import { HOME_VIEW, ORGAN_LAYOUT, type OrganId, type OrganReport } from "./organs";

export interface HudRefs {
  container: RefObject<HTMLDivElement | null>;
  card: RefObject<HTMLElement | null>;
  svg: RefObject<SVGSVGElement | null>;
  line: RefObject<SVGPolylineElement | null>;
  dot: RefObject<SVGCircleElement | null>;
  ring: RefObject<SVGCircleElement | null>;
}

interface SceneProps {
  reports: Record<OrganId, OrganReport>;
  selected: OrganId | null;
  onSelect: (id: OrganId | null) => void;
  onModelMissing: () => void;
  hud: HudRefs;
  reducedMotion: boolean;
}

function CameraRig({ selected, hud }: { selected: OrganId | null; hud: HudRefs }) {
  const { camera, size, controls } = useThree();
  const active = useRef(false);
  const desired = useMemo(() => ({ target: new THREE.Vector3(), sph: new THREE.Spherical() }), []);
  const offset = useRef({ x: 0, y: 0 });
  const tmp = useMemo(() => ({ v: new THREE.Vector3(), s: new THREE.Spherical(), p: new THREE.Vector3() }), []);

  useEffect(() => {
    const layout = selected ? ORGAN_LAYOUT[selected] : null;
    desired.target.set(...(layout ? layout.focus : HOME_VIEW.target));
    desired.sph.setFromVector3(new THREE.Vector3(0.32, 0.04, 1).normalize().multiplyScalar(layout ? layout.distance : HOME_VIEW.distance));
    active.current = true;
  }, [selected, desired]);

  useEffect(() => {
    const c = controls as unknown as THREE.EventDispatcher<{ start: object }> | null;
    if (!c) return;
    const stop = () => {
      active.current = false;
    };
    c.addEventListener("start", stop);
    return () => c.removeEventListener("start", stop);
  }, [controls]);

  useFrame((_, dt) => {
    const c = controls as unknown as { target: THREE.Vector3 } | null;
    if (!c) return;
    const cam = camera as THREE.PerspectiveCamera;

    if (active.current) {
      const k = 1 - Math.exp(-dt * 3.2);
      const cur = tmp.s.setFromVector3(tmp.v.copy(cam.position).sub(c.target));
      const dTheta = Math.atan2(Math.sin(desired.sph.theta - cur.theta), Math.cos(desired.sph.theta - cur.theta));
      const dPhi = desired.sph.phi - cur.phi;
      const dRadius = desired.sph.radius - cur.radius;
      cur.theta += dTheta * k;
      cur.phi += dPhi * k;
      cur.radius += dRadius * k;
      c.target.lerp(desired.target, k);
      cam.position.setFromSpherical(cur).add(c.target);
      if (Math.abs(dTheta) < 0.004 && Math.abs(dPhi) < 0.004 && Math.abs(dRadius) < 0.005 && c.target.distanceTo(desired.target) < 0.004) {
        active.current = false;
      }
    }

    // Shift the framing so the focused organ sits clear of the HUD card.
    const wide = size.width >= 720;
    const tx = selected && wide ? Math.min(170, size.width * 0.18) : 0;
    const ty = selected && !wide ? size.height * 0.16 : 0;
    const k2 = 1 - Math.exp(-dt * 4);
    offset.current.x += (tx - offset.current.x) * k2;
    offset.current.y += (ty - offset.current.y) * k2;
    if (Math.abs(offset.current.x) > 0.5 || Math.abs(offset.current.y) > 0.5) {
      cam.setViewOffset(size.width, size.height, offset.current.x, offset.current.y, size.width, size.height);
    } else if (cam.view?.enabled) {
      cam.clearViewOffset();
    }
  }, -2);

  useFrame(() => {
    const svg = hud.svg.current;
    const card = hud.card.current;
    const container = hud.container.current;
    if (!svg) return;
    if (!selected || !card || !container) {
      svg.style.opacity = "0";
      return;
    }
    camera.updateMatrixWorld();
    tmp.p.set(...ORGAN_LAYOUT[selected].anchor).project(camera);
    const x = (tmp.p.x * 0.5 + 0.5) * size.width;
    const y = (-tmp.p.y * 0.5 + 0.5) * size.height;
    const cr = card.getBoundingClientRect();
    const br = container.getBoundingClientRect();
    const wide = size.width >= 720;
    const ax = wide ? cr.left - br.left : cr.left - br.left + cr.width / 2;
    const ay = wide
      ? THREE.MathUtils.clamp(y, cr.top - br.top + 28, cr.bottom - br.top - 28)
      : cr.top - br.top;
    const ex = wide ? ax - 40 : ax;
    const ey = wide ? ay : ay - 26;
    hud.line.current?.setAttribute("points", `${x},${y} ${ex},${ey} ${ax},${ay}`);
    for (const el of [hud.dot.current, hud.ring.current]) {
      el?.setAttribute("cx", String(x));
      el?.setAttribute("cy", String(y));
    }
    svg.style.opacity = tmp.p.z < 1 ? "1" : "0";
  });

  return null;
}

function ScanRig({ scanY, reducedMotion }: { scanY: { current: number }; reducedMotion: boolean }) {
  const ring = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const y = reducedMotion ? -5 : (0.5 - 0.5 * Math.cos(clock.elapsedTime * 0.55)) * 1.9 - 0.05;
    scanY.current = y;
    if (ring.current) {
      ring.current.position.y = y;
      ring.current.visible = !reducedMotion;
    }
  });
  return (
    <group>
      <group ref={ring}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.36, 0.0035, 8, 128]} />
          <meshBasicMaterial color="#6fd6ff" transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.2, 0.36, 96]} />
          <meshBasicMaterial color="#2f7bff" transparent opacity={0.08} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      </group>

      <group position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <mesh>
          <circleGeometry args={[0.55, 64]} />
          <meshBasicMaterial color="#1d4ed8" transparent opacity={0.1} depthWrite={false} />
        </mesh>
        {[0.42, 0.6, 0.9].map((r, i) => (
          <mesh key={r}>
            <ringGeometry args={[r, r + 0.004, 128]} />
            <meshBasicMaterial color="#4cc9ff" transparent opacity={0.4 - i * 0.1} blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function Stage({ reports, selected, onSelect, onModelMissing, hud, reducedMotion }: SceneProps) {
  const [hovered, setHovered] = useState<OrganId | null>(null);
  useCursor(hovered !== null);

  const material = useMemo(() => createHoloMaterial(), []);
  useEffect(() => () => material.dispose(), [material]);

  const scanY = useRef(0);
  const dim = useRef(1);
  dim.current = selected ? 0.4 : hovered ? 0.7 : 1;

  const breath = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!breath.current || reducedMotion) return;
    const s = 1 + 0.004 * Math.sin(clock.elapsedTime * 1.3);
    breath.current.scale.set(s, 1, s);
  });

  return (
    <>
      <color attach="background" args={["#05060e"]} />
      <fog attach="fog" args={[HORIZON_COLOR, 8, 26]} />
      <MarsEnvironment reducedMotion={reducedMotion} />

      <ambientLight intensity={0.35} color="#9db8ff" />
      <directionalLight position={[-2.5, 2.5, -3]} intensity={2.6} color="#4cc9ff" />
      <directionalLight position={[3, 1.5, -2.5]} intensity={2} color="#2f6bff" />
      <directionalLight position={[0, 2, 3]} intensity={0.6} color="#dbeafe" />

      <group ref={breath}>
        <Suspense fallback={null}>
          <HoloBody material={material} scanY={scanY} dim={dim} onFallback={onModelMissing} />
        </Suspense>
        <Organs reports={reports} selected={selected} hovered={hovered} onHover={setHovered} onSelect={onSelect} />
      </group>

      <ScanRig scanY={scanY} reducedMotion={reducedMotion} />

      <OrbitControls
        makeDefault
        target={HOME_VIEW.target}
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={0.7}
        maxDistance={6.5}
        minPolarAngle={0.3}
        maxPolarAngle={1.72}
        autoRotate={!reducedMotion && !selected && !hovered}
        autoRotateSpeed={0.6}
      />
      <CameraRig selected={selected} hud={hud} />

      <EffectComposer multisampling={0}>
        <Bloom intensity={0.85} luminanceThreshold={0.18} luminanceSmoothing={0.5} mipmapBlur />
      </EffectComposer>
    </>
  );
}

export default function Scene(props: SceneProps) {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ fov: 32, near: 0.1, far: 120, position: [0, 1.3, HOME_VIEW.distance] }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      onPointerMissed={() => props.onSelect(null)}
    >
      <Stage {...props} />
    </Canvas>
  );
}
