import { TAU, fbm, mulberry32, smoothstep } from "./noise";

/* The sky is authored in a rotated "galactic" frame: `a` runs along the Milky Way,
   `b` runs across it. Coordinates are normalised so the sky square spans [-0.5, 0.5]. */

const BAND_ANGLE = -0.52;
const BAND_COS = Math.cos(BAND_ANGLE);
const BAND_SIN = Math.sin(BAND_ANGLE);
const CORE_POSITION = 0.1;

function toBand(nx: number, ny: number): [number, number] {
  return [nx * BAND_COS + ny * BAND_SIN, -nx * BAND_SIN + ny * BAND_COS];
}

function bandWidth(a: number): number {
  const bulge = Math.exp(-(((a - CORE_POSITION) / 0.26) ** 2));
  return 0.075 + 0.07 * bulge;
}

/** Smooth analytic density of the galactic band, used to place stars. */
export function bandProfile(nx: number, ny: number): number {
  const [a, b] = toBand(nx, ny);
  const width = bandWidth(a);
  return Math.min(1, Math.exp(-((b / width) ** 2)) + 0.3 * Math.exp(-((b / (width * 3)) ** 2)));
}

/** Low-resolution Milky Way, dust lanes and faint nebulae rendered into an offscreen canvas. */
export function buildSkyTexture(size: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const image = ctx.createImageData(size, size);
  const data = image.data;
  const dither = mulberry32(7);

  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const nx = i / size - 0.5;
      const ny = j / size - 0.5;
      const [a, b0] = toBand(nx, ny);

      const wobble = (fbm(a * 2.4 + 3, b0 * 2.4, 11, 4) - 0.5) * 0.14;
      const b = b0 + wobble;
      const width = bandWidth(a);
      const coreMask = Math.exp(-((b / width) ** 2));
      const halo = Math.exp(-((b / (width * 3)) ** 2)) * 0.32;
      const clouds = fbm(a * 11, b * 11, 23, 6);
      const bulgeBoost = Math.exp(-(((a - CORE_POSITION) / 0.22) ** 2));

      let density = coreMask * (0.45 + 1.15 * clouds) * (1 + 0.9 * bulgeBoost) + halo * (0.5 + clouds);

      const ridged = 1 - Math.abs(2 * fbm(a * 9 + 7, b * 15, 31, 5) - 1);
      const dustPatches = smoothstep(0.6, 0.92, ridged) * Math.exp(-((b / (width * 1.1)) ** 2));
      const rift = Math.exp(-(((b - 0.012 * Math.sin(a * 16)) / (0.011 + 0.012 * clouds)) ** 2)) * (0.35 + bulgeBoost);
      const dust = Math.min(1, dustPatches * 0.95 + rift * 0.75);
      density *= 1 - 0.82 * dust;

      const warmth = Math.min(1, bulgeBoost * coreMask * 1.4);
      let r = 150 + (255 - 150) * warmth;
      let g = 170 + (212 - 170) * warmth;
      let bl = 235 + (160 - 235) * warmth;
      const intensity = density * 0.21;

      r *= intensity;
      g *= intensity;
      bl *= intensity;

      const emission = smoothstep(0.62, 0.86, fbm(a * 4.5 + 20, b * 4.5, 41, 4)) * (coreMask + halo);
      const reflection = smoothstep(0.64, 0.88, fbm(a * 5 - 12, b * 5 + 9, 53, 4)) * (coreMask * 0.7 + halo);
      r += emission * 34 + reflection * 8;
      g += emission * 7 + reflection * 18;
      bl += emission * 14 + reflection * 44;

      const rim = 1 - Math.min(1, Math.hypot(nx, ny) * 1.15);
      r += 3.2 + rim * 1.4;
      g += 5 + rim * 2.4;
      bl += 11 + rim * 5;

      const noise = (dither() - 0.5) * 1.6;
      const k = (j * size + i) * 4;
      data[k] = r + noise;
      data[k + 1] = g + noise;
      data[k + 2] = bl + noise;
      data[k + 3] = 255;
    }
  }

  ctx.putImageData(image, 0, 0);
  return canvas;
}

export interface SkyStar {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  bucket: number;
  phase: number;
  speed: number;
  amplitude: number;
  spikes: boolean;
}

/** Blackbody colour for a temperature in kelvin (Tanner Helland approximation). */
export function kelvinToRgb(kelvin: number): [number, number, number] {
  const t = kelvin / 100;
  const clamp = (v: number) => Math.min(255, Math.max(0, v));
  const r = t <= 66 ? 255 : 329.698727446 * (t - 60) ** -0.1332047592;
  const g = t <= 66 ? 99.4708025861 * Math.log(t) - 161.1195681661 : 288.1221695283 * (t - 60) ** -0.0755148492;
  const b = t >= 66 ? 255 : t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  return [clamp(r), clamp(g), clamp(b)];
}

export const STAR_TEMPERATURES = [3000, 3700, 4500, 5300, 6000, 6800, 8200, 11000, 17000];
const TEMPERATURE_WEIGHTS = [0.17, 0.14, 0.15, 0.16, 0.14, 0.1, 0.08, 0.04, 0.02];

function pickBucket(random: () => number): number {
  let r = random();
  for (let i = 0; i < TEMPERATURE_WEIGHTS.length; i++) {
    r -= TEMPERATURE_WEIGHTS[i] ?? 0;
    if (r <= 0) return i;
  }
  return 4;
}

function samplePosition(random: () => number, minimumDensity: number): [number, number] {
  for (let attempt = 0; attempt < 40; attempt++) {
    const nx = random() - 0.5;
    const ny = random() - 0.5;
    if (random() < minimumDensity + (1 - minimumDensity) * bandProfile(nx, ny)) return [nx, ny];
  }
  return [random() - 0.5, random() - 0.5];
}

/** Brighter, individually rendered stars. They shimmer very slightly and carry diffraction spikes when bright. */
export function buildStars(sky: number, count: number): SkyStar[] {
  const random = mulberry32(2026);
  const stars: SkyStar[] = [];
  for (let i = 0; i < count; i++) {
    const [nx, ny] = samplePosition(random, 0.32);
    const magnitude = random() ** 3.6;
    stars.push({
      x: nx * sky,
      y: ny * sky,
      radius: 0.55 + magnitude * 2.1,
      alpha: 0.32 + magnitude * 0.68,
      bucket: pickBucket(random),
      phase: random() * TAU,
      speed: 0.25 + random() * 0.9,
      amplitude: 0.05 + random() * 0.14,
      spikes: magnitude > 0.9,
    });
  }
  return stars;
}

/** Thousands of faint, static stars baked once; density follows the galactic band. */
export function buildDustStars(sky: number, bakedSize: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = bakedSize;
  canvas.height = bakedSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const random = mulberry32(99);
  const palette = STAR_TEMPERATURES.map((t) => {
    const [r, g, b] = kelvinToRgb(t);
    const mix = 0.4;
    return [r + (255 - r) * mix, g + (255 - g) * mix, b + (255 - b) * mix].map(Math.round) as [number, number, number];
  });

  const count = Math.floor((sky * sky) / 85);
  const scale = bakedSize / sky;
  ctx.globalCompositeOperation = "lighter";

  for (let i = 0; i < count; i++) {
    const [nx, ny] = samplePosition(random, 0.1);
    const m = random() ** 3;
    const color = palette[pickBucket(random)] ?? [255, 255, 255];
    const alpha = 0.08 + m * 0.5;
    const size = m > 0.7 ? 1.7 : 1.1;
    ctx.fillStyle = `rgba(${color[0]},${color[1]},${color[2]},${alpha})`;
    ctx.fillRect((nx + 0.5) * sky * scale, (ny + 0.5) * sky * scale, size * scale, size * scale);
  }
  return canvas;
}
