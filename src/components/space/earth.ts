import { fbm, hash, smoothstep } from "./noise";

/**
 * Night-side surface strip seen from orbit: moonlit cloud decks and city lights.
 * Horizontally seamless so it can scroll forever; vertically compressed toward the horizon
 * to mimic perspective foreshortening.
 */
export function buildEarthSurface(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const image = ctx.createImageData(width, height);
  const data = image.data;
  const period = Math.max(4, 2 * Math.round(width / 200));

  for (let j = 0; j < height; j++) {
    const t = j / (height - 1);
    const depth = (1 / (t + 0.08)) * 0.9;
    const haze = Math.exp(-t * 7.5);

    for (let i = 0; i < width; i++) {
      const x = (i / width) * period;

      const cloudField = fbm(x, depth + 3, 61, 5, period);
      const cloud = smoothstep(0.47, 0.78, cloudField);

      const land = smoothstep(0.5, 0.6, fbm(x * 0.5, depth * 0.5 + 9, 73, 4, period / 2));
      const urban = fbm(x * 4, depth * 4, 83, 4, period * 4);
      const city = Math.max(0, urban - 0.46) / 0.54;
      const sparkle = 0.55 + 0.9 * hash(i, j, 5);
      const lights = land * city * city * 3.4 * sparkle * (1 - 0.78 * cloud);

      let r = 2 + cloud * 40 + lights * 255;
      let g = 6 + cloud * 56 + lights * 178;
      let b = 16 + cloud * 86 + lights * 88;

      r += haze * 12;
      g += haze * 30;
      b += haze * 70;

      const k = (j * width + i) * 4;
      data[k] = r;
      data[k + 1] = g;
      data[k + 2] = b;
      data[k + 3] = 255;
    }
  }

  ctx.putImageData(image, 0, 0);
  return canvas;
}
