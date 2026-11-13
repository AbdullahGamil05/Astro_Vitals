import { Component, useMemo, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { BODY_HEIGHT } from "./organs";

export const MODEL_URL = "/models/human-body.glb";

const vertexShader = /* glsl */ `
#include <common>
#include <skinning_pars_vertex>
varying vec3 vN;
varying vec3 vV;
varying vec3 vW;
void main() {
  #include <beginnormal_vertex>
  #include <skinbase_vertex>
  #include <skinnormal_vertex>
  #include <begin_vertex>
  #include <skinning_vertex>
  vec4 mv = modelViewMatrix * vec4(transformed, 1.0);
  vN = normalize(normalMatrix * objectNormal);
  vV = -mv.xyz;
  vW = (modelMatrix * vec4(transformed, 1.0)).xyz;
  gl_Position = projectionMatrix * mv;
}
`;

const fragmentShader = /* glsl */ `
uniform float uTime;
uniform float uScanY;
uniform float uDim;
uniform vec3 uEdge;
uniform vec3 uCore;
varying vec3 vN;
varying vec3 vV;
varying vec3 vW;
void main() {
  vec3 n = normalize(vN);
  if (!gl_FrontFacing) n = -n;
  float fresnel = pow(1.0 - clamp(dot(n, normalize(vV)), 0.0, 1.0), 2.3);
  float lines = smoothstep(0.9, 1.0, 0.5 + 0.5 * sin(vW.y * 210.0 - uTime * 0.6)) * 0.1;
  float band = exp(-pow((vW.y - uScanY) * 16.0, 2.0));
  float facing = gl_FrontFacing ? 1.0 : 0.4;
  vec3 col = mix(uCore, uEdge, fresnel) + uEdge * band * 1.1;
  float a = (0.045 + fresnel * 0.8 + lines + band * 0.55) * facing * uDim;
  gl_FragColor = vec4(col, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export type HoloMaterial = THREE.ShaderMaterial & {
  uniforms: {
    uTime: THREE.IUniform<number>;
    uScanY: THREE.IUniform<number>;
    uDim: THREE.IUniform<number>;
    uEdge: THREE.IUniform<THREE.Color>;
    uCore: THREE.IUniform<THREE.Color>;
  };
};

export function createHoloMaterial(): HoloMaterial {
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uScanY: { value: 0 },
      uDim: { value: 1 },
      uEdge: { value: new THREE.Color("#4cc9ff") },
      uCore: { value: new THREE.Color("#0b3a9c") },
    },
  }) as HoloMaterial;
}

interface BodyProps {
  material: HoloMaterial;
  scanY: { current: number };
  dim: { current: number };
}

function useHoloUniforms({ material, scanY, dim }: BodyProps) {
  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.elapsedTime;
    material.uniforms.uScanY.value = scanY.current;
    material.uniforms.uDim.value = THREE.MathUtils.lerp(material.uniforms.uDim.value, dim.current, 0.08);
  });
}

/** Scales the model to BODY_HEIGHT, stands it on y=0 and centres it on x/z. */
function normalise(source: THREE.Object3D, material: THREE.Material) {
  const root = cloneSkinned(source);
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.material = material;
      mesh.renderOrder = 2;
      mesh.frustumCulled = false;
    }
  });

  const pivot = new THREE.Group();
  pivot.add(root);
  pivot.updateMatrixWorld(true);

  let size = new THREE.Box3().setFromObject(pivot).getSize(new THREE.Vector3());
  if (size.z > size.y && size.z >= size.x) pivot.rotation.x = -Math.PI / 2;
  else if (size.x > size.y) pivot.rotation.z = Math.PI / 2;
  pivot.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(pivot);
  size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const scale = BODY_HEIGHT / Math.max(size.y, 0.0001);

  const holder = new THREE.Group();
  holder.add(pivot);
  pivot.position.set(-center.x, -box.min.y, -center.z);
  holder.scale.setScalar(scale);
  return holder;
}

function GltfBody(props: BodyProps) {
  const { scene } = useGLTF(MODEL_URL);
  const body = useMemo(() => normalise(scene, props.material), [scene, props.material]);
  useHoloUniforms(props);
  return <primitive object={body} />;
}

function Limb({ from, to, radius, material }: { from: [number, number, number]; to: [number, number, number]; radius: number; material: THREE.Material }) {
  const { position, quaternion, length } = useMemo(() => {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const dir = b.clone().sub(a);
    const len = dir.length();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    return { position: a.add(b).multiplyScalar(0.5), quaternion: q, length: len };
  }, [from, to]);
  return (
    <mesh position={position} quaternion={quaternion} material={material} renderOrder={2}>
      <capsuleGeometry args={[radius, Math.max(length - radius * 2, 0.01), 8, 20]} />
    </mesh>
  );
}

/** Stand-in silhouette used until /models/human-body.glb is available. */
function ProceduralBody(props: BodyProps) {
  useHoloUniforms(props);
  const m = props.material;
  return (
    <group>
      <mesh position={[0, 1.69, 0]} scale={[0.85, 1.1, 0.95]} material={m} renderOrder={2}>
        <sphereGeometry args={[0.105, 32, 24]} />
      </mesh>
      <Limb from={[0, 1.57, 0]} to={[0, 1.5, 0]} radius={0.05} material={m} />
      <mesh position={[0, 1.27, 0]} scale={[1, 1, 0.62]} material={m} renderOrder={2}>
        <capsuleGeometry args={[0.17, 0.3, 10, 28]} />
      </mesh>
      <mesh position={[0, 1.0, 0]} scale={[1, 1, 0.65]} material={m} renderOrder={2}>
        <capsuleGeometry args={[0.15, 0.12, 10, 28]} />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s}>
          <Limb from={[s * 0.2, 1.46, 0]} to={[s * 0.34, 1.1, 0]} radius={0.04} material={m} />
          <Limb from={[s * 0.34, 1.1, 0]} to={[s * 0.4, 0.82, 0.04]} radius={0.034} material={m} />
          <Limb from={[s * 0.09, 0.92, 0]} to={[s * 0.1, 0.5, 0.01]} radius={0.07} material={m} />
          <Limb from={[s * 0.1, 0.5, 0.01]} to={[s * 0.1, 0.08, 0]} radius={0.048} material={m} />
          <mesh position={[s * 0.1, 0.03, 0.05]} material={m} renderOrder={2}>
            <boxGeometry args={[0.08, 0.05, 0.2]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

class ModelBoundary extends Component<
  { onError: () => void; fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function HoloBody({ onFallback, ...props }: BodyProps & { onFallback: () => void }) {
  return (
    <ModelBoundary onError={onFallback} fallback={<ProceduralBody {...props} />}>
      <GltfBody {...props} />
    </ModelBoundary>
  );
}
