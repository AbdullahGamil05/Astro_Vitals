import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { statusColor } from "@/lib/health";
import { ORGAN_LAYOUT, type OrganId, type OrganReport } from "./organs";

interface OrganMaterials {
  solid: THREE.MeshStandardMaterial;
  wire: THREE.MeshBasicMaterial;
}

const MaterialsContext = createContext<OrganMaterials | null>(null);

function useMaterials() {
  const m = useContext(MaterialsContext);
  if (!m) throw new Error("Organ parts must render inside an OrganShell");
  return m;
}

function foldedSphere(radius: number, seed: number, amount = 0.07) {
  const g = new THREE.SphereGeometry(radius, 44, 30);
  const pos = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n = v.clone().normalize();
    const d =
      1 +
      amount * Math.sin(n.x * 13 + seed) * Math.sin(n.y * 11 + seed * 0.5) +
      amount * 0.7 * Math.sin(n.z * 17 + n.x * 5);
    v.multiplyScalar(d);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

function lobe(width: number, height: number, depth: number) {
  const g = new THREE.SphereGeometry(1, 36, 26);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const w = 0.78 - 0.24 * y;
    pos.setXYZ(i, x * width * w, y * height, z * depth * w);
  }
  g.computeVertexNormals();
  return g;
}

function tube(points: Array<[number, number, number]>, radius: number, segments = 48, closed = false) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), closed);
  return new THREE.TubeGeometry(curve, segments, radius, 8, closed);
}

function Part({
  geo,
  position,
  rotation,
  scale,
  quaternion,
  wire = true,
}: {
  geo: THREE.BufferGeometry;
  position?: [number, number, number] | THREE.Vector3;
  rotation?: [number, number, number];
  scale?: [number, number, number] | number;
  quaternion?: THREE.Quaternion;
  wire?: boolean;
}) {
  const m = useMaterials();
  return (
    <group position={position} rotation={rotation} scale={scale} quaternion={quaternion}>
      <mesh geometry={geo} material={m.solid} renderOrder={3} />
      {wire ? <mesh geometry={geo} material={m.wire} scale={1.004} renderOrder={4} /> : null}
    </group>
  );
}

function Brain() {
  const hemi = useMemo(() => foldedSphere(0.078, 1.3, 0.08), []);
  const cerebellum = useMemo(() => foldedSphere(0.04, 4, 0.1), []);
  const stem = useMemo(() => new THREE.CapsuleGeometry(0.014, 0.05, 6, 12), []);
  return (
    <group>
      <Part geo={hemi} position={[-0.037, 0, 0.004]} scale={[0.82, 0.86, 1.15]} />
      <Part geo={hemi} position={[0.037, 0, 0.004]} scale={[0.82, 0.86, 1.15]} />
      <Part geo={cerebellum} position={[0, -0.045, -0.065]} scale={[1.3, 0.8, 1]} />
      <Part geo={stem} position={[0, -0.085, -0.03]} rotation={[0.25, 0, 0]} />
    </group>
  );
}

function Heart({ bpm }: { bpm: number }) {
  const ref = useRef<THREE.Group>(null);
  const body = useMemo(() => foldedSphere(0.042, 2, 0.04), []);
  const aorta = useMemo(
    () => tube([[0.006, 0.035, 0], [0.002, 0.072, 0.006], [-0.025, 0.09, 0], [-0.045, 0.062, -0.012]], 0.011),
    [],
  );
  const vein = useMemo(() => tube([[-0.02, 0.03, 0.004], [-0.03, 0.07, 0.004], [-0.012, 0.1, 0]], 0.008), []);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const phase = (clock.elapsedTime * (bpm / 60)) % 1;
    const beat = Math.exp(-Math.pow((phase - 0.05) * 16, 2)) + 0.6 * Math.exp(-Math.pow((phase - 0.3) * 16, 2));
    ref.current.scale.setScalar(1 + 0.09 * beat);
  });
  return (
    <group ref={ref}>
      <Part geo={body} scale={[0.9, 1.15, 0.85]} rotation={[0, 0, 0.45]} />
      <Part geo={aorta} />
      <Part geo={vein} />
    </group>
  );
}

function Lungs({ rate }: { rate: number }) {
  const ref = useRef<THREE.Group>(null);
  const right = useMemo(() => lobe(0.06, 0.105, 0.052), []);
  const left = useMemo(() => lobe(0.052, 0.098, 0.05), []);
  const trachea = useMemo(() => tube([[0, 0.14, -0.005], [0, 0.07, -0.005]], 0.011, 12), []);
  const bronchR = useMemo(() => tube([[0, 0.07, -0.005], [-0.025, 0.045, 0], [-0.05, 0.02, 0.005]], 0.008, 16), []);
  const bronchL = useMemo(() => tube([[0, 0.07, -0.005], [0.025, 0.045, 0], [0.05, 0.02, 0.005]], 0.008, 16), []);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const s = Math.sin(clock.elapsedTime * ((Math.PI * 2 * rate) / 60));
    ref.current.scale.set(1 + 0.04 * s, 1 + 0.025 * s, 1 + 0.05 * s);
  });
  return (
    <group ref={ref}>
      <Part geo={right} position={[-0.092, 0, 0.0]} />
      <Part geo={left} position={[0.086, -0.005, 0.0]} />
      <Part geo={trachea} wire={false} />
      <Part geo={bronchR} wire={false} />
      <Part geo={bronchL} wire={false} />
    </group>
  );
}

function Metabolic() {
  const liver = useMemo(() => foldedSphere(1, 3, 0.03), []);
  const stomach = useMemo(() => foldedSphere(1, 5, 0.03), []);
  const kidney = useMemo(() => foldedSphere(1, 7, 0.02), []);
  const gut = useMemo(() => {
    const pts: Array<[number, number, number]> = [];
    for (let row = 0; row < 5; row++) {
      const dir = row % 2 === 0 ? 1 : -1;
      for (let i = 0; i <= 6; i++) {
        const x = dir * (-0.095 + (i / 6) * 0.19);
        pts.push([x, -0.03 - row * 0.024 + 0.006 * Math.sin(i * 1.7), 0.01 + 0.012 * Math.sin(i + row)]);
      }
    }
    return tube(pts, 0.0125, 260);
  }, []);
  return (
    <group>
      <Part geo={liver} position={[-0.075, 0.05, -0.005]} scale={[0.088, 0.046, 0.055]} rotation={[0, 0, 0.18]} />
      <Part geo={stomach} position={[0.058, 0.03, 0]} scale={[0.046, 0.055, 0.04]} rotation={[0, 0, -0.6]} />
      <Part geo={gut} />
      <Part geo={kidney} position={[-0.065, 0.02, -0.06]} scale={[0.018, 0.032, 0.016]} wire={false} />
      <Part geo={kidney} position={[0.065, 0.02, -0.06]} scale={[0.018, 0.032, 0.016]} wire={false} />
    </group>
  );
}

const SPINE_BASE = 0.92;
const SPINE_TOP = 1.52;

function Skeleton() {
  const vertebra = useMemo(() => new THREE.CylinderGeometry(1, 1.08, 1, 12), []);
  const joint = useMemo(() => new THREE.SphereGeometry(0.022, 16, 12), []);
  const rib = useMemo(() => new THREE.TorusGeometry(1, 0.005, 6, 48), []);
  const pelvis = useMemo(() => new THREE.TorusGeometry(0.11, 0.016, 8, 36), []);
  const sternum = useMemo(() => new THREE.BoxGeometry(0.03, 0.17, 0.008), []);
  const bone = useMemo(() => new THREE.CylinderGeometry(0.008, 0.01, 1, 8), []);

  const vertebrae = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => {
        const t = i / 23;
        const y = SPINE_BASE + t * (SPINE_TOP - SPINE_BASE);
        const z = -0.058 + 0.022 * Math.sin(t * Math.PI * 2 + 0.4);
        const r = 0.009 + (1 - t) * 0.009;
        return { y, z, r };
      }),
    [],
  );

  const ribs = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => {
        const t = i / 7;
        const rx = 0.1 + Math.sin(t * Math.PI * 0.85 + 0.2) * 0.06;
        return { y: 1.5 - i * 0.03, rx, rz: rx * 0.62 };
      }),
    [],
  );

  const bones = useMemo(() => {
    const segs: Array<[[number, number, number], [number, number, number]]> = [];
    for (const s of [-1, 1]) {
      segs.push([[s * 0.092, 0.92, 0], [s * 0.092, 0.5, 0.012]]);
      segs.push([[s * 0.092, 0.5, 0.012], [s * 0.098, 0.085, 0]]);
      segs.push([[0.012 * s, 1.49, 0.02], [s * 0.19, 1.46, 0]]);
    }
    return segs.map(([a, b]) => {
      const va = new THREE.Vector3(...a);
      const vb = new THREE.Vector3(...b);
      const dir = vb.clone().sub(va);
      return {
        position: va.clone().add(vb).multiplyScalar(0.5),
        quaternion: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize()),
        length: dir.length(),
      };
    });
  }, []);

  const joints: Array<[number, number, number]> = [
    [-0.19, 1.46, 0], [0.19, 1.46, 0],
    [-0.092, 0.92, 0], [0.092, 0.92, 0],
    [-0.092, 0.5, 0.012], [0.092, 0.5, 0.012],
    [-0.098, 0.085, 0], [0.098, 0.085, 0],
  ];

  return (
    <group>
      {vertebrae.map((v, i) => (
        <Part key={i} geo={vertebra} position={[0, v.y, v.z]} scale={[v.r, 0.013, v.r * 0.9]} />
      ))}
      {ribs.map((r, i) => (
        <Part key={i} geo={rib} position={[0, r.y, -0.01]} rotation={[Math.PI / 2, 0, 0]} scale={[r.rx, r.rz, 1]} wire={false} />
      ))}
      <Part geo={sternum} position={[0, 1.4, 0.075]} wire={false} />
      <Part geo={pelvis} position={[0, 0.93, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 0.62, 1]} wire={false} />
      {bones.map((b, i) => (
        <Part key={i} geo={bone} position={b.position} quaternion={b.quaternion} scale={[1, b.length, 1]} wire={false} />
      ))}
      {joints.map((p, i) => (
        <Part key={i} geo={joint} position={p} wire={false} />
      ))}
    </group>
  );
}

const ORGAN_ORIGIN: Record<OrganId, readonly [number, number, number]> = {
  brain: [0, 1.7, 0],
  heart: [0.035, 1.33, 0.03],
  lungs: [0, 1.38, 0.02],
  metabolic: [0, 1.1, 0.03],
  skeleton: [0, 0, 0],
};

interface ShellProps {
  report: OrganReport;
  selected: boolean;
  hovered: boolean;
  someSelected: boolean;
  onHover: (id: OrganId | null) => void;
  onSelect: (id: OrganId) => void;
  children: ReactNode;
  absolute?: boolean;
}

function OrganShell({ report, selected, hovered, someSelected, onHover, onSelect, children, absolute }: ShellProps) {
  const color = statusColor[report.status];
  const materials = useMemo<OrganMaterials>(
    () => ({
      solid: new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.9,
        roughness: 0.4,
        metalness: 0.1,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
      }),
      wire: new THREE.MeshBasicMaterial({
        color,
        wireframe: true,
        transparent: true,
        opacity: 0.3,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    }),
    [color],
  );

  useEffect(
    () => () => {
      materials.solid.dispose();
      materials.wire.dispose();
    },
    [materials],
  );

  const phase = useMemo(() => report.id.length, [report.id]);

  useFrame(({ clock }, dt) => {
    const k = 1 - Math.exp(-dt * 8);
    const pulse = 1 + 0.12 * Math.sin(clock.elapsedTime * 2 + phase);
    const emissive = selected ? 2.3 : hovered ? 1.9 : someSelected ? 0.45 : 0.95;
    const opacity = selected ? 0.85 : hovered ? 0.8 : someSelected ? 0.3 : 0.55;
    const wire = selected ? 0.7 : hovered ? 0.6 : someSelected ? 0.15 : 0.3;
    materials.solid.emissiveIntensity = THREE.MathUtils.lerp(materials.solid.emissiveIntensity, emissive * pulse, k);
    materials.solid.opacity = THREE.MathUtils.lerp(materials.solid.opacity, opacity, k);
    materials.wire.opacity = THREE.MathUtils.lerp(materials.wire.opacity, wire, k);
  });

  const layout = ORGAN_LAYOUT[report.id];
  const origin = absolute ? ([0, 0, 0] as const) : ORGAN_ORIGIN[report.id];

  return (
    <MaterialsContext.Provider value={materials}>
      <group
        position={origin as [number, number, number]}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          onHover(report.id);
        }}
        onPointerOut={() => onHover(null)}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          onSelect(report.id);
        }}
      >
        {children}
      </group>
      {hovered && !selected ? (
        <Html position={[layout.anchor[0] + 0.12, layout.anchor[1], layout.anchor[2] + 0.08]} style={{ pointerEvents: "none" }} zIndexRange={[20, 0]}>
          <span className="whitespace-nowrap rounded border border-white/20 bg-black/70 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-ink backdrop-blur">
            {report.name}
          </span>
        </Html>
      ) : null}
    </MaterialsContext.Provider>
  );
}

interface OrgansProps {
  reports: Record<OrganId, OrganReport>;
  selected: OrganId | null;
  hovered: OrganId | null;
  onHover: (id: OrganId | null) => void;
  onSelect: (id: OrganId) => void;
}

export function Organs({ reports, selected, hovered, onHover, onSelect }: OrgansProps) {
  const shared = { selected: false, someSelected: selected !== null, onHover, onSelect };
  const flags = (id: OrganId) => ({ ...shared, selected: selected === id, hovered: hovered === id });
  return (
    <group>
      <OrganShell report={reports.brain} {...flags("brain")}>
        <Brain />
      </OrganShell>
      <OrganShell report={reports.lungs} {...flags("lungs")}>
        <Lungs rate={reports.lungs.breathRate} />
      </OrganShell>
      <OrganShell report={reports.heart} {...flags("heart")}>
        <Heart bpm={reports.heart.bpm} />
      </OrganShell>
      <OrganShell report={reports.metabolic} {...flags("metabolic")}>
        <Metabolic />
      </OrganShell>
      <OrganShell report={reports.skeleton} {...flags("skeleton")} absolute>
        <Skeleton />
      </OrganShell>
    </group>
  );
}
