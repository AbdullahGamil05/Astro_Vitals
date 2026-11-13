import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

/** Colour of the dusty horizon. The ground fog and the sky texture both fade to it so they meet seamlessly. */
export const HORIZON_COLOR = "#4a2519";

const SKY_RADIUS = 48;

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createSkyTexture() {
  const W = 2048;
  const H = 1024;
  const horizon = H / 2;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  const sky = ctx.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, "#03040b");
  sky.addColorStop(0.45, "#070818");
  sky.addColorStop(0.72, "#150f1d");
  sky.addColorStop(0.88, "#2a1519");
  sky.addColorStop(1, HORIZON_COLOR);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, horizon);
  ctx.fillStyle = HORIZON_COLOR;
  ctx.fillRect(0, horizon, W, H - horizon);

  // Faint galactic band
  ctx.save();
  ctx.filter = "blur(36px)";
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  for (const [width, alpha] of [
    [150, 0.045],
    [70, 0.05],
    [26, 0.05],
  ] as const) {
    ctx.strokeStyle = `rgba(140,150,220,${alpha})`;
    ctx.lineWidth = width;
    ctx.beginPath();
    for (let x = -40; x <= W + 40; x += 32) {
      const y = horizon * 0.46 + Math.sin((x / W) * Math.PI * 2 + 0.6) * horizon * 0.22;
      if (x === -40) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();

  // Dust glow hugging the horizon
  ctx.save();
  ctx.filter = "blur(18px)";
  ctx.globalCompositeOperation = "lighter";
  const glowX = W * 0.62;
  const sun = ctx.createRadialGradient(glowX, horizon, 0, glowX, horizon, 360);
  sun.addColorStop(0, "rgba(230,130,86,0.20)");
  sun.addColorStop(0.4, "rgba(170,86,56,0.09)");
  sun.addColorStop(1, "rgba(120,50,30,0)");
  ctx.fillStyle = sun;
  ctx.fillRect(0, horizon - 220, W, 220);
  const haze = ctx.createLinearGradient(0, horizon - 90, 0, horizon);
  haze.addColorStop(0, "rgba(140,70,46,0)");
  haze.addColorStop(1, "rgba(140,70,46,0.14)");
  ctx.fillStyle = haze;
  ctx.fillRect(0, horizon - 90, W, 90);
  ctx.restore();

  // Distant ridgelines, wrapped so the seam is invisible
  ctx.save();
  ctx.filter = "blur(1.6px)";
  const layers = [
    { height: 15, tone: "#3f2017", seed: 2.1, freq: 3 },
    { height: 11, tone: "#351a13", seed: 5.7, freq: 5 },
    { height: 6, tone: "#2b140f", seed: 9.3, freq: 8 },
  ];
  for (const layer of layers) {
    const ridge = ctx.createLinearGradient(0, horizon - layer.height * 2, 0, horizon + 2);
    ridge.addColorStop(0, layer.tone);
    ridge.addColorStop(1, HORIZON_COLOR);
    ctx.fillStyle = ridge;
    ctx.beginPath();
    ctx.moveTo(0, horizon + 2);
    for (let x = 0; x <= W; x += 8) {
      const t = (x / W) * Math.PI * 2;
      const n =
        0.5 +
        0.28 * Math.sin(t * layer.freq + layer.seed) +
        0.16 * Math.sin(t * layer.freq * 2.7 + layer.seed * 2) +
        0.08 * Math.sin(t * layer.freq * 6.1 + layer.seed * 3);
      ctx.lineTo(x, horizon - n * layer.height);
    }
    ctx.lineTo(W, horizon + 2);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function createGroundTexture() {
  const S = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext("2d")!;
  const rand = rng(21);

  ctx.fillStyle = "#3b1d14";
  ctx.fillRect(0, 0, S, S);

  const wrap = (x: number, y: number, r: number, draw: (px: number, py: number) => void) => {
    for (const dx of [-S, 0, S]) {
      for (const dy of [-S, 0, S]) {
        const px = x + dx;
        const py = y + dy;
        if (px + r < 0 || px - r > S || py + r < 0 || py - r > S) continue;
        draw(px, py);
      }
    }
  };

  const tones = ["85,41,27", "46,22,16", "74,42,31", "96,52,34", "34,17,13"];
  for (let i = 0; i < 170; i++) {
    const x = rand() * S;
    const y = rand() * S;
    const r = 40 + rand() * 170;
    const tone = tones[Math.floor(rand() * tones.length)];
    const alpha = 0.07 + rand() * 0.14;
    wrap(x, y, r, (px, py) => {
      const g = ctx.createRadialGradient(px, py, 0, px, py, r);
      g.addColorStop(0, `rgba(${tone},${alpha})`);
      g.addColorStop(1, `rgba(${tone},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(px - r, py - r, r * 2, r * 2);
    });
  }

  // Wind-blown dust streaks
  for (let i = 0; i < 90; i++) {
    const x = rand() * S;
    const y = rand() * S;
    const len = 60 + rand() * 200;
    const thick = 2 + rand() * 7;
    const light = rand() > 0.5;
    wrap(x, y, len, (px, py) => {
      ctx.fillStyle = light ? "rgba(140,80,52,0.07)" : "rgba(20,8,6,0.1)";
      ctx.beginPath();
      ctx.ellipse(px, py, len, thick, 0.06, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // Shallow craters
  for (let i = 0; i < 18; i++) {
    const x = rand() * S;
    const y = rand() * S;
    const r = 24 + rand() * 60;
    wrap(x, y, r, (px, py) => {
      const g = ctx.createRadialGradient(px - r * 0.15, py - r * 0.15, r * 0.1, px, py, r);
      g.addColorStop(0, "rgba(22,9,7,0.28)");
      g.addColorStop(0.78, "rgba(22,9,7,0.12)");
      g.addColorStop(0.9, "rgba(150,86,58,0.14)");
      g.addColorStop(1, "rgba(150,86,58,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(px, py, r, r * 0.78, 0, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // Pebbles
  ctx.filter = "blur(0.6px)";
  for (let i = 0; i < 1400; i++) {
    const x = rand() * S;
    const y = rand() * S;
    const r = 0.6 + rand() * 2.2;
    const dark = rand() > 0.45;
    wrap(x, y, r, (px, py) => {
      ctx.fillStyle = dark ? `rgba(18,8,6,${0.25 + rand() * 0.3})` : `rgba(150,92,64,${0.12 + rand() * 0.18})`;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(16, 16);
  texture.anisotropy = 8;
  return texture;
}

function Stars() {
  const geometry = useMemo(() => {
    const rand = rng(99);
    const count = 1700;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const tint = new THREE.Color();
    for (let i = 0; i < count; i++) {
      // Bias towards the zenith so the horizon stays clear and hazy
      const elevation = Math.asin(Math.pow(rand(), 0.75)) * 0.98 + 0.03;
      const azimuth = rand() * Math.PI * 2;
      positions[i * 3] = SKY_RADIUS * 0.95 * Math.cos(elevation) * Math.cos(azimuth);
      positions[i * 3 + 1] = SKY_RADIUS * 0.95 * Math.sin(elevation);
      positions[i * 3 + 2] = SKY_RADIUS * 0.95 * Math.cos(elevation) * Math.sin(azimuth);
      const warm = rand();
      tint.setHSL(warm > 0.8 ? 0.07 : warm < 0.35 ? 0.6 : 0.12, 0.35, 0.55 + rand() * 0.25);
      const brightness = 0.25 + Math.pow(rand(), 3) * 0.75;
      colors[i * 3] = tint.r * brightness;
      colors[i * 3 + 1] = tint.g * brightness;
      colors[i * 3 + 2] = tint.b * brightness;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return g;
  }, []);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <points geometry={geometry} frustumCulled={false} renderOrder={-9}>
      <pointsMaterial
        vertexColors
        size={1.5}
        sizeAttenuation={false}
        transparent
        opacity={0.85}
        depthWrite={false}
        fog={false}
        toneMapped={false}
      />
    </points>
  );
}

function Dust({ reducedMotion }: { reducedMotion: boolean }) {
  const ref = useRef<THREE.Points>(null);
  const geometry = useMemo(() => {
    const rand = rng(5);
    const count = 160;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 1.4 + Math.sqrt(rand()) * 9;
      const a = rand() * Math.PI * 2;
      positions[i * 3] = Math.cos(a) * r;
      positions[i * 3 + 1] = 0.04 + Math.pow(rand(), 1.8) * 2.8;
      positions[i * 3 + 2] = Math.sin(a) * r;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame((_, dt) => {
    if (ref.current && !reducedMotion) ref.current.rotation.y += dt * 0.012;
  });

  return (
    <points ref={ref} geometry={geometry} frustumCulled={false} renderOrder={-4}>
      <pointsMaterial color="#a8643f" size={2} sizeAttenuation={false} transparent opacity={0.28} depthWrite={false} />
    </points>
  );
}

/** Dim, low-contrast Martian surface under a starry sky, kept behind the holographic scanner. */
export function MarsEnvironment({ reducedMotion }: { reducedMotion: boolean }) {
  const { camera } = useThree();
  const skyRig = useRef<THREE.Group>(null);
  const sky = useMemo(() => createSkyTexture(), []);
  const ground = useMemo(() => createGroundTexture(), []);

  useEffect(
    () => () => {
      sky.dispose();
      ground.dispose();
    },
    [sky, ground],
  );

  useFrame(() => {
    skyRig.current?.position.copy(camera.position);
  });

  return (
    <>
      <group ref={skyRig}>
        <mesh renderOrder={-10} frustumCulled={false}>
          <sphereGeometry args={[SKY_RADIUS, 64, 32]} />
          <meshBasicMaterial map={sky} side={THREE.BackSide} depthWrite={false} fog={false} toneMapped={false} />
        </mesh>
        <Stars />
      </group>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.006, 0]} renderOrder={-5}>
        <circleGeometry args={[70, 96]} />
        <meshBasicMaterial map={ground} toneMapped={false} />
      </mesh>

      <Dust reducedMotion={reducedMotion} />
    </>
  );
}
