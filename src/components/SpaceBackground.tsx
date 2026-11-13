import { useEffect, useRef } from "react";
import { buildEarthSurface } from "./space/earth";
import { TAU, mulberry32, smoothstep } from "./space/noise";
import {
  STAR_TEMPERATURES,
  buildDustStars,
  buildSkyTexture,
  buildStars,
  kelvinToRgb,
  type SkyStar,
} from "./space/sky";

/** Radians per second: the whole sky turns slowly, like a long-exposure from orbit. */
const SKY_ROTATION_SPEED = 0.0045;
const EARTH_SCROLL_SPEED = 9;
const SUNRISE_PERIOD = 120;
const BASE_COLOR = "#02050d";

interface Scene {
  w: number;
  h: number;
  sky: number;
  skyTexture: HTMLCanvasElement;
  dustStars: HTMLCanvasElement;
  stars: SkyStar[];
  sprites: HTMLCanvasElement[];
  spikeH: HTMLCanvasElement;
  spikeV: HTMLCanvasElement;
  earthSurface: HTMLCanvasElement;
  earthR: number;
  earthCx: number;
  earthCy: number;
  earthTop: number;
  vignette: CanvasGradient;
  limb: CanvasGradient;
}

interface Meteor {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  length: number;
}

interface Satellite {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
}

interface Lightning {
  x: number;
  y: number;
  age: number;
  size: number;
}

function createCanvas(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D | null] {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.ceil(width));
  canvas.height = Math.max(1, Math.ceil(height));
  return [canvas, canvas.getContext("2d")];
}

function buildStarSprite(kelvin: number): HTMLCanvasElement {
  const size = 64;
  const [canvas, ctx] = createCanvas(size, size);
  if (!ctx) return canvas;
  const [r, g, b] = kelvinToRgb(kelvin).map(Math.round) as [number, number, number];
  const soft = [r + (255 - r) * 0.55, g + (255 - g) * 0.55, b + (255 - b) * 0.55].map(Math.round);
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.16, `rgba(${soft[0]},${soft[1]},${soft[2]},0.95)`);
  gradient.addColorStop(0.3, `rgba(${r},${g},${b},0.5)`);
  gradient.addColorStop(0.55, `rgba(${r},${g},${b},0.1)`);
  gradient.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return canvas;
}

function buildSpikeSprite(horizontal: boolean): HTMLCanvasElement {
  const long = 256;
  const short = 6;
  const [canvas, ctx] = createCanvas(horizontal ? long : short, horizontal ? short : long);
  if (!ctx) return canvas;
  const gradient = horizontal ? ctx.createLinearGradient(0, 0, long, 0) : ctx.createLinearGradient(0, 0, 0, long);
  gradient.addColorStop(0, "rgba(190,215,255,0)");
  gradient.addColorStop(0.46, "rgba(220,235,255,0.55)");
  gradient.addColorStop(0.5, "rgba(255,255,255,0.95)");
  gradient.addColorStop(0.54, "rgba(220,235,255,0.55)");
  gradient.addColorStop(1, "rgba(190,215,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const fadeAcross = horizontal ? ctx.createLinearGradient(0, 0, 0, short) : ctx.createLinearGradient(0, 0, short, 0);
  fadeAcross.addColorStop(0, "rgba(0,0,0,1)");
  fadeAcross.addColorStop(0.5, "rgba(0,0,0,0)");
  fadeAcross.addColorStop(1, "rgba(0,0,0,1)");
  ctx.globalCompositeOperation = "destination-out";
  ctx.fillStyle = fadeAcross;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return canvas;
}

function buildScene(ctx: CanvasRenderingContext2D, w: number, h: number): Scene {
  const sky = Math.ceil(Math.hypot(w, h) * 1.06);

  const skyResolution = Math.min(640, Math.ceil(sky / 3));
  const skyTexture = buildSkyTexture(skyResolution);

  const bakedSize = Math.min(sky, 2600);
  const dustStars = buildDustStars(sky, bakedSize);

  const starCount = Math.min(2400, Math.floor((sky * sky) / 2600));
  const stars = buildStars(sky, starCount);
  const sprites = STAR_TEMPERATURES.map(buildStarSprite);

  const earthR = Math.max(w * 1.6, 900);
  const earthTop = h - Math.max(h * 0.17, 120);
  const earthCx = w / 2;
  const earthCy = earthTop + earthR;
  const surfaceHeight = Math.ceil((h - earthTop) / 2);
  const earthSurface = buildEarthSurface(Math.ceil(w / 2), Math.max(24, surfaceHeight));

  const vignette = ctx.createRadialGradient(w / 2, h * 0.45, Math.min(w, h) * 0.35, w / 2, h * 0.45, Math.hypot(w, h) * 0.62);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,2,8,0.62)");

  const outer = earthR * 1.07;
  const at = (radius: number) => Math.min(1, Math.max(0, (radius * earthR) / outer));
  const limb = ctx.createRadialGradient(earthCx, earthCy, 0, earthCx, earthCy, outer);
  limb.addColorStop(0, "rgba(0,0,0,0)");
  limb.addColorStop(at(0.97), "rgba(40,90,200,0)");
  limb.addColorStop(at(0.992), "rgba(70,140,255,0.2)");
  limb.addColorStop(at(0.9985), "rgba(120,190,255,0.62)");
  limb.addColorStop(at(1.0), "rgba(190,225,255,0.9)");
  limb.addColorStop(at(1.0035), "rgba(110,180,255,0.5)");
  limb.addColorStop(at(1.009), "rgba(60,130,245,0.2)");
  limb.addColorStop(at(1.016), "rgba(70,230,170,0.075)");
  limb.addColorStop(at(1.024), "rgba(190,90,110,0.03)");
  limb.addColorStop(at(1.04), "rgba(30,70,200,0.015)");
  limb.addColorStop(1, "rgba(0,0,0,0)");

  return {
    w,
    h,
    sky,
    skyTexture,
    dustStars,
    stars,
    sprites,
    spikeH: buildSpikeSprite(true),
    spikeV: buildSpikeSprite(false),
    earthSurface,
    earthR,
    earthCx,
    earthCy,
    earthTop,
    vignette,
    limb,
  };
}

export function SpaceBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return;
    const ctx: CanvasRenderingContext2D = context;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const random = mulberry32(Math.floor(Math.random() * 1e9));

    let scene: Scene | null = null;
    let time = 0;
    let last = 0;
    let raf = 0;
    let rebuildTimer = 0;
    const meteors: Meteor[] = [];
    const satellites: Satellite[] = [];
    const flashes: Lightning[] = [];
    let nextMeteor = 6 + random() * 8;
    let nextSatellite = 9 + random() * 6;
    let nextFlash = 3 + random() * 4;

    const applySize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
    };

    const rebuild = () => {
      applySize();
      scene = buildScene(ctx, window.innerWidth, window.innerHeight);
      if (reduced) render(0);
    };

    const scheduleRebuild = () => {
      applySize();
      window.clearTimeout(rebuildTimer);
      rebuildTimer = window.setTimeout(rebuild, 180);
    };

    const drawSky = (s: Scene) => {
      const cx = s.w / 2;
      const cy = s.h / 2;
      const angle = time * SKY_ROTATION_SPEED;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      ctx.drawImage(s.skyTexture, -s.sky / 2, -s.sky / 2, s.sky, s.sky);
      ctx.globalCompositeOperation = "lighter";
      ctx.drawImage(s.dustStars, -s.sky / 2, -s.sky / 2, s.sky, s.sky);
      ctx.restore();

      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      ctx.globalCompositeOperation = "lighter";
      for (const star of s.stars) {
        const x = cx + star.x * cos - star.y * sin;
        const y = cy + star.x * sin + star.y * cos;
        const reach = star.radius * 8 + 8;
        if (x < -reach || x > s.w + reach || y < -reach || y > s.h + reach) continue;

        const shimmer = 1 - star.amplitude + star.amplitude * Math.sin(time * star.speed + star.phase);
        const alpha = star.alpha * shimmer;
        const sprite = s.sprites[star.bucket];
        if (!sprite) continue;

        const diameter = Math.max(3.2, star.radius * 2 * 3.6);
        ctx.globalAlpha = Math.min(1, alpha);
        ctx.drawImage(sprite, x - diameter / 2, y - diameter / 2, diameter, diameter);

        if (star.spikes) {
          const length = star.radius * 9;
          ctx.globalAlpha = Math.min(1, alpha * 0.4);
          ctx.drawImage(s.spikeH, x - length, y - 3, length * 2, 6);
          ctx.drawImage(s.spikeV, x - 3, y - length, 6, length * 2);
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    };

    const sunrise = () => {
      const phase = Math.sin((time / SUNRISE_PERIOD) * TAU - 1.2);
      return smoothstep(0.1, 0.95, phase);
    };

    const drawEarth = (s: Scene) => {
      const { w, h, earthR, earthCx, earthCy, earthTop } = s;
      const glow = sunrise();
      const sunX = w * 0.78;
      const sunY = earthCy - Math.sqrt(Math.max(0, earthR * earthR - (sunX - earthCx) ** 2));

      ctx.save();
      ctx.beginPath();
      ctx.arc(earthCx, earthCy, earthR, 0, TAU);
      ctx.clip();

      ctx.fillStyle = "#01040b";
      ctx.fillRect(0, earthTop - 4, w, h - earthTop + 8);

      const surfaceW = s.earthSurface.width * 2;
      const offset = (time * EARTH_SCROLL_SPEED) % surfaceW;
      const drawH = h - earthTop;
      for (let x = -offset; x < w; x += surfaceW) {
        ctx.drawImage(s.earthSurface, x, earthTop, surfaceW, drawH);
      }

      ctx.globalCompositeOperation = "lighter";
      for (let i = flashes.length - 1; i >= 0; i--) {
        const f = flashes[i];
        if (!f) continue;
        const p = f.age / 0.45;
        if (p >= 1) {
          flashes.splice(i, 1);
          continue;
        }
        const pulse = (p < 0.2 ? p / 0.2 : p < 0.35 ? 0.35 : p < 0.5 ? 0.9 : 1 - (p - 0.5) / 0.5) * (1 - p * 0.4);
        const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.size);
        g.addColorStop(0, `rgba(190,210,255,${0.55 * pulse})`);
        g.addColorStop(0.4, `rgba(110,150,230,${0.18 * pulse})`);
        g.addColorStop(1, "rgba(80,110,200,0)");
        ctx.fillStyle = g;
        ctx.fillRect(f.x - f.size, f.y - f.size, f.size * 2, f.size * 2);
      }

      if (glow > 0.001) {
        const g = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, w * 0.55);
        g.addColorStop(0, `rgba(255,170,90,${0.34 * glow})`);
        g.addColorStop(0.35, `rgba(120,90,160,${0.12 * glow})`);
        g.addColorStop(1, "rgba(30,60,140,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, earthTop - 10, w, h - earthTop + 10);
      }
      ctx.restore();

      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = s.limb;
      ctx.beginPath();
      ctx.arc(earthCx, earthCy, earthR * 1.07, 0, TAU);
      ctx.fill();

      if (glow > 0.001) {
        const reach = w * 0.34;
        const halo = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, reach);
        halo.addColorStop(0, `rgba(255,248,225,${0.95 * glow})`);
        halo.addColorStop(0.06, `rgba(255,214,150,${0.7 * glow})`);
        halo.addColorStop(0.22, `rgba(255,140,60,${0.3 * glow})`);
        halo.addColorStop(0.55, `rgba(90,140,255,${0.1 * glow})`);
        halo.addColorStop(1, "rgba(40,90,255,0)");
        ctx.fillStyle = halo;
        ctx.fillRect(sunX - reach, sunY - reach, reach * 2, reach * 2);

        const streak = ctx.createLinearGradient(sunX - reach * 1.4, 0, sunX + reach * 1.4, 0);
        streak.addColorStop(0, "rgba(255,200,130,0)");
        streak.addColorStop(0.5, `rgba(255,225,170,${0.5 * glow})`);
        streak.addColorStop(1, "rgba(255,200,130,0)");
        ctx.fillStyle = streak;
        ctx.fillRect(sunX - reach * 1.4, sunY - 1, reach * 2.8, 2);
      }
      ctx.globalCompositeOperation = "source-over";
    };

    const spawnEvents = (dt: number, s: Scene) => {
      if (time >= nextMeteor) {
        const angle = (18 + random() * 22) * (Math.PI / 180);
        const speed = 520 + random() * 380;
        meteors.push({
          x: s.w * (0.3 + random() * 0.8),
          y: random() * s.h * 0.35,
          vx: -Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          age: 0,
          life: 0.6 + random() * 0.6,
          length: 90 + random() * 150,
        });
        nextMeteor = time + 9 + random() * 14;
      }

      if (time >= nextSatellite) {
        const fromLeft = random() < 0.5;
        const speed = 38 + random() * 22;
        satellites.push({
          x: fromLeft ? -20 : s.w + 20,
          y: s.h * (0.08 + random() * 0.45),
          vx: fromLeft ? speed : -speed,
          vy: (random() - 0.5) * 8,
          age: 0,
          life: (s.w + 40) / speed,
        });
        nextSatellite = time + 22 + random() * 20;
      }

      if (time >= nextFlash) {
        flashes.push({
          x: s.w * (0.08 + random() * 0.84),
          y: s.earthTop + (s.h - s.earthTop) * (0.2 + random() * 0.7),
          age: 0,
          size: 50 + random() * 90,
        });
        nextFlash = time + 3.5 + random() * 7;
      }

      for (const f of flashes) f.age += dt;
    };

    const drawMeteors = (dt: number) => {
      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i];
        if (!m) continue;
        m.age += dt;
        if (m.age > m.life) {
          meteors.splice(i, 1);
          continue;
        }
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        const fade = Math.sin((m.age / m.life) * Math.PI);
        const speed = Math.hypot(m.vx, m.vy);
        const tx = m.x - (m.vx / speed) * m.length;
        const ty = m.y - (m.vy / speed) * m.length;
        const g = ctx.createLinearGradient(m.x, m.y, tx, ty);
        g.addColorStop(0, `rgba(255,255,255,${0.9 * fade})`);
        g.addColorStop(0.2, `rgba(205,230,255,${0.45 * fade})`);
        g.addColorStop(1, "rgba(120,170,255,0)");
        ctx.strokeStyle = g;
        ctx.lineWidth = 1.2;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(tx, ty);
        ctx.stroke();
      }
    };

    const drawSatellites = (dt: number) => {
      for (let i = satellites.length - 1; i >= 0; i--) {
        const sat = satellites[i];
        if (!sat) continue;
        sat.age += dt;
        if (sat.age > sat.life) {
          satellites.splice(i, 1);
          continue;
        }
        sat.x += sat.vx * dt;
        sat.y += sat.vy * dt;
        const edge = Math.min(sat.age, sat.life - sat.age);
        const visibility = smoothstep(0, 2.5, edge);
        const glint = 0.8 + 0.2 * Math.sin(sat.age * 1.3);
        const alpha = visibility * glint;
        const g = ctx.createRadialGradient(sat.x, sat.y, 0, sat.x, sat.y, 5);
        g.addColorStop(0, `rgba(255,252,240,${alpha})`);
        g.addColorStop(0.3, `rgba(255,240,210,${alpha * 0.35})`);
        g.addColorStop(1, "rgba(255,240,210,0)");
        ctx.fillStyle = g;
        ctx.fillRect(sat.x - 5, sat.y - 5, 10, 10);
      }
    };

    function render(dt: number) {
      const s = scene;
      if (!s) return;
      time += dt;

      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.fillStyle = BASE_COLOR;
      ctx.fillRect(0, 0, s.w, s.h);

      if (!reduced) spawnEvents(dt, s);
      drawSky(s);
      if (!reduced) {
        ctx.globalCompositeOperation = "lighter";
        drawMeteors(dt);
        drawSatellites(dt);
        ctx.globalCompositeOperation = "source-over";
      }
      drawEarth(s);

      ctx.fillStyle = s.vignette;
      ctx.fillRect(0, 0, s.w, s.h);
    }

    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      render(dt);
      raf = requestAnimationFrame(loop);
    };

    const start = () => {
      if (reduced || raf) return;
      last = performance.now();
      raf = requestAnimationFrame(loop);
    };

    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };

    const onVisibility = () => (document.hidden ? stop() : start());

    time = 40 + random() * 200;
    rebuild();
    start();
    window.addEventListener("resize", scheduleRebuild);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      window.clearTimeout(rebuildTimer);
      window.removeEventListener("resize", scheduleRebuild);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 size-full" />;
}
