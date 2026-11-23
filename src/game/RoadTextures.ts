import * as THREE from 'three';
import { RoadTheme } from '../types/game';

export interface RoadTextureBundle {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  repeatY: number;
  dispose: () => void;
}

export interface TerrainTextureBundle {
  map: THREE.CanvasTexture;
  repeatX: number;
  repeatY: number;
  dispose: () => void;
}

// Deterministic fast PRNG so road grain is sharp & consistent across frames
function createSeededRandom(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function hexToRgb(hex: number): { r: number; g: number; b: number } {
  return {
    r: (hex >> 16) & 255,
    g: (hex >> 8) & 255,
    b: hex & 255,
  };
}

function rgbCss(r: number, g: number, b: number, a = 1): string {
  return `rgba(${Math.max(0, Math.min(255, Math.round(r)))}, ${Math.max(
    0,
    Math.min(255, Math.round(g))
  )}, ${Math.max(0, Math.min(255, Math.round(b)))}, ${a})`;
}

/**
 * Generates high-detail seamless highway asphalt albedo, bump, and roughness textures
 * mapped cleanly to a 30m-wide 5-lane highway (lanes at -6.4, -3.2, 0, 3.2, 6.4).
 */
export function createHighwayRoadTextureSet(
  theme: RoadTheme,
  maxAnisotropy: number
): RoadTextureBundle {
  const width = 1024;
  const height = 1024;
  const repeatY = 30; // 1500m / 30 = 50m per seamless tile

  const albedoCanvas = document.createElement('canvas');
  albedoCanvas.width = width;
  albedoCanvas.height = height;
  const actx = albedoCanvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = width;
  bumpCanvas.height = height;
  const bctx = bumpCanvas.getContext('2d')!;

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = width;
  roughCanvas.height = height;
  const rctx = roughCanvas.getContext('2d')!;

  const isDayOrNatural =
    theme.skyType === 'daytime' ||
    theme.skyType === 'coxsbazar_marine' ||
    theme.skyType === 'sahara_sunset';

  const baseRgb = hexToRgb(theme.roadColor);
  // Keep asphalt rich dark charcoal in daytime so painted lines & tire marks contrast realistically
  const asphaltBase = isDayOrNatural
    ? {
        r: Math.max(38, Math.min(58, baseRgb.r + 14)),
        g: Math.max(41, Math.min(62, baseRgb.g + 14)),
        b: Math.max(46, Math.min(68, baseRgb.b + 14)),
      }
    : {
        r: Math.max(18, baseRgb.r + 12),
        g: Math.max(20, baseRgb.g + 14),
        b: Math.max(28, baseRgb.b + 18),
      };

  // Base fills
  actx.fillStyle = rgbCss(asphaltBase.r, asphaltBase.g, asphaltBase.b);
  actx.fillRect(0, 0, width, height);

  bctx.fillStyle = 'rgb(128,128,128)';
  bctx.fillRect(0, 0, width, height);

  // Higher values = rougher tarmac
  rctx.fillStyle = theme.weather === 'rain' ? 'rgb(95,95,95)' : 'rgb(200,200,200)';
  rctx.fillRect(0, 0, width, height);

  // Map road X in [-15, +15] to canvas U in [0, width]
  const xToPx = (roadX: number) => ((roadX + 15) / 30) * width;
  const wToPx = (meters: number) => (meters / 30) * width;

  // 1. Paved shoulders (slightly lighter gravel/shoulder tarmac outside +-8.45m)
  const leftShoulderEnd = xToPx(-8.45);
  const rightShoulderStart = xToPx(8.45);
  const shoulderColor = rgbCss(
    asphaltBase.r + (isDayOrNatural ? 13 : 8),
    asphaltBase.g + (isDayOrNatural ? 12 : 8),
    asphaltBase.b + (isDayOrNatural ? 10 : 9),
    0.85
  );
  actx.fillStyle = shoulderColor;
  actx.fillRect(0, 0, leftShoulderEnd, height);
  actx.fillRect(rightShoulderStart, 0, width - rightShoulderStart, height);

  // Concrete drainage apron / gutter edge along outer borders (-15..-13.8 and 13.8..15)
  const gutterW = wToPx(1.1);
  actx.fillStyle = isDayOrNatural ? 'rgba(130, 138, 150, 0.72)' : 'rgba(40, 52, 72, 0.8)';
  actx.fillRect(0, 0, gutterW, height);
  actx.fillRect(width - gutterW, 0, gutterW, height);

  // 2. Asphalt pixel-level aggregate grain across albedo & bump
  const rand = createSeededRandom(4291);
  const aImg = actx.getImageData(0, 0, width, height);
  const bImg = bctx.getImageData(0, 0, width, height);
  const aData = aImg.data;
  const bData = bImg.data;

  for (let i = 0; i < aData.length; i += 4) {
    const n = (rand() - 0.5) * 26;
    const speck = rand() > 0.985 ? 24 : 0; // tiny quartz aggregate glint
    aData[i] = Math.max(0, Math.min(255, aData[i] + n + speck));
    aData[i + 1] = Math.max(0, Math.min(255, aData[i + 1] + n + speck));
    aData[i + 2] = Math.max(0, Math.min(255, aData[i + 2] + n + speck));

    const bv = Math.max(0, Math.min(255, 128 + n * 3.1 + speck * 1.5));
    bData[i] = bv;
    bData[i + 1] = bv;
    bData[i + 2] = bv;
  }
  actx.putImageData(aImg, 0, 0);
  bctx.putImageData(bImg, 0, 0);

  // 3. Realistic longitudinal tire wear tracks in all 5 driving lanes (-6.4, -3.2, 0, 3.2, 6.4)
  const laneCenters = [-6.4, -3.2, 0, 3.2, 6.4];
  laneCenters.forEach((cx) => {
    [-0.72, 0.72].forEach((wheelOffset) => {
      const wx = xToPx(cx + wheelOffset);
      const trackWidth = wToPx(0.85);
      const grad = actx.createLinearGradient(wx - trackWidth, 0, wx + trackWidth, 0);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(0.5, isDayOrNatural ? 'rgba(12,14,18,0.34)' : 'rgba(0,0,0,0.42)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      actx.fillStyle = grad;
      actx.fillRect(wx - trackWidth, 0, trackWidth * 2, height);

      // Smoother polished rubber tracks catch directional & headlamp sheen
      const rGrad = rctx.createLinearGradient(wx - trackWidth, 0, wx + trackWidth, 0);
      rGrad.addColorStop(0, 'rgba(120,120,120,0)');
      rGrad.addColorStop(0.5, 'rgba(75,75,75,0.8)');
      rGrad.addColorStop(1, 'rgba(120,120,120,0)');
      rctx.fillStyle = rGrad;
      rctx.fillRect(wx - trackWidth, 0, trackWidth * 2, height);
    });
  });

  // 4. Subtle sealed tar repair cracks & longitudinal seam joints (wrapped seamlessly at top/bottom)
  actx.strokeStyle = 'rgba(10, 12, 16, 0.45)';
  actx.lineWidth = 2;
  for (let c = 0; c < 10; c++) {
    const startX = xToPx(-8 + rand() * 16);
    const startY = rand() * height;
    const len = 60 + rand() * 110;
    const drawCrack = (offsetY: number) => {
      actx.beginPath();
      let cx = startX;
      let cy = startY + offsetY;
      actx.moveTo(cx, cy);
      for (let s = 0; s < 5; s++) {
        cx += (rand() - 0.5) * 14;
        cy += len / 5;
        actx.lineTo(cx, cy);
      }
      actx.stroke();
    };
    drawCrack(0);
    if (startY + len > height) drawCrack(-height);
  }

  // Subtle longitudinal asphalt paving seam along lane dividers (-4.8, -1.6, 1.6, 4.8)
  [-4.8, -1.6, 1.6, 4.8].forEach((divX) => {
    const px = xToPx(divX);
    actx.fillStyle = 'rgba(8, 10, 14, 0.25)';
    actx.fillRect(px - 1, 0, 2, height);
  });

  // 5. Machined Shoulder Rumble Strips (tactile indentations every 16px along +-8.9m)
  const rumbleStep = 16;
  const rumbleH = 7;
  const rumbleW = wToPx(0.52);
  [-8.95, 8.95].forEach((rx) => {
    const px = xToPx(rx) - rumbleW / 2;
    for (let y = 0; y < height; y += rumbleStep) {
      actx.fillStyle = 'rgba(12, 14, 18, 0.48)';
      actx.fillRect(px, y, rumbleW, rumbleH);
      actx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      actx.fillRect(px, y + rumbleH, rumbleW, 2);

      bctx.fillStyle = 'rgb(45,45,45)';
      bctx.fillRect(px, y, rumbleW, rumbleH);
    }
  });

  // 6. Solid Continuous Highway Edge Lines (Left Yellow/ThemeB median line, Right White/ThemeA shoulder line)
  const lineARgb = hexToRgb(theme.lineColorA);
  const lineBRgb = hexToRgb(theme.lineColorB);
  const leftEdgeColor = isDayOrNatural
    ? 'rgba(250, 204, 21, 0.92)' // Real highway yellow median edge line
    : rgbCss(lineBRgb.r, lineBRgb.g, lineBRgb.b, 0.92);
  const rightEdgeColor = isDayOrNatural
    ? 'rgba(248, 250, 252, 0.92)' // Real highway white shoulder edge line
    : rgbCss(lineARgb.r, lineARgb.g, lineARgb.b, 0.92);

  const edgeLineW = wToPx(0.24);
  actx.fillStyle = leftEdgeColor;
  actx.fillRect(xToPx(-8.45) - edgeLineW / 2, 0, edgeLineW, height);

  actx.fillStyle = rightEdgeColor;
  actx.fillRect(xToPx(8.45) - edgeLineW / 2, 0, edgeLineW, height);

  // Subtle asphalt wear speckles across painted lines so they feel bonded into tarmac
  actx.fillStyle = rgbCss(asphaltBase.r, asphaltBase.g, asphaltBase.b, 0.45);
  for (let s = 0; s < 260; s++) {
    const sy = rand() * height;
    const side = s % 2 === 0 ? -8.45 : 8.45;
    actx.fillRect(xToPx(side) + (rand() - 0.5) * edgeLineW, sy, 2 + rand() * 3, 2 + rand() * 4);
  }

  // Painted edge lines are slightly smoother than raw tarmac
  rctx.fillStyle = 'rgb(125,125,125)';
  rctx.fillRect(xToPx(-8.45) - edgeLineW / 2, 0, edgeLineW, height);
  rctx.fillRect(xToPx(8.45) - edgeLineW / 2, 0, edgeLineW, height);

  // 7. Subtle Diagonal Shoulder Warning Chevrons near outer emergency shoulder (+-11.2m)
  actx.strokeStyle = isDayOrNatural ? 'rgba(241, 245, 249, 0.24)' : rgbCss(lineARgb.r, lineARgb.g, lineARgb.b, 0.22);
  actx.lineWidth = wToPx(0.16);
  for (let y = 32; y < height; y += 128) {
    // Left shoulder chevron
    actx.beginPath();
    actx.moveTo(xToPx(-9.7), y);
    actx.lineTo(xToPx(-12.2), y + 42);
    actx.stroke();
    // Right shoulder chevron
    actx.beginPath();
    actx.moveTo(xToPx(9.7), y);
    actx.lineTo(xToPx(12.2), y + 42);
    actx.stroke();
  }

  // 8. Realistic Rain Puddle Patches in roughnessMap for specular reflections
  for (let p = 0; p < 14; p++) {
    const px = xToPx(-7.5 + rand() * 15);
    const py = rand() * height;
    const rx = 18 + rand() * 26;
    const ry = 45 + rand() * 80;
    const pGrad = rctx.createRadialGradient(px, py, 2, px, py, Math.max(rx, ry));
    pGrad.addColorStop(0, 'rgba(12,12,12,0.95)');
    pGrad.addColorStop(0.6, 'rgba(30,30,30,0.6)');
    pGrad.addColorStop(1, 'rgba(120,120,120,0)');
    rctx.fillStyle = pGrad;
    rctx.beginPath();
    rctx.ellipse(px, py, rx, ry, 0, 0, Math.PI * 2);
    rctx.fill();
  }

  const configureTex = (canvas: HTMLCanvasElement, isColor: boolean) => {
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, repeatY);
    tex.anisotropy = maxAnisotropy;
    if (isColor) {
      tex.colorSpace = THREE.SRGBColorSpace;
    }
    tex.needsUpdate = true;
    return tex;
  };

  const map = configureTex(albedoCanvas, true);
  const bumpMap = configureTex(bumpCanvas, false);
  const roughnessMap = configureTex(roughCanvas, false);

  return {
    map,
    bumpMap,
    roughnessMap,
    repeatY,
    dispose: () => {
      map.dispose();
      bumpMap.dispose();
      roughnessMap.dispose();
    },
  };
}

/**
 * Generates procedural asphalt & concrete bridge deck textures for the 3-lane Elevated Flyover.
 */
export function createFlyoverTextureSet(
  theme: RoadTheme,
  maxAnisotropy: number
): RoadTextureBundle {
  const width = 512;
  const height = 512;
  const repeatY = 38;

  const albedoCanvas = document.createElement('canvas');
  albedoCanvas.width = width;
  albedoCanvas.height = height;
  const actx = albedoCanvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = width;
  bumpCanvas.height = height;
  const bctx = bumpCanvas.getContext('2d')!;

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = width;
  roughCanvas.height = height;
  const rctx = roughCanvas.getContext('2d')!;

  const isDayOrNatural =
    theme.skyType === 'daytime' ||
    theme.skyType === 'coxsbazar_marine' ||
    theme.skyType === 'sahara_sunset';

  const base = isDayOrNatural ? { r: 54, g: 58, b: 66 } : { r: 24, g: 28, b: 40 };
  actx.fillStyle = rgbCss(base.r, base.g, base.b);
  actx.fillRect(0, 0, width, height);

  bctx.fillStyle = 'rgb(128,128,128)';
  bctx.fillRect(0, 0, width, height);

  rctx.fillStyle = 'rgb(190,190,190)';
  rctx.fillRect(0, 0, width, height);

  const rand = createSeededRandom(8817);
  const aImg = actx.getImageData(0, 0, width, height);
  const bImg = bctx.getImageData(0, 0, width, height);
  for (let i = 0; i < aImg.data.length; i += 4) {
    const n = (rand() - 0.5) * 22;
    aImg.data[i] = Math.max(0, Math.min(255, aImg.data[i] + n));
    aImg.data[i + 1] = Math.max(0, Math.min(255, aImg.data[i + 1] + n));
    aImg.data[i + 2] = Math.max(0, Math.min(255, aImg.data[i + 2] + n));
    const bv = Math.max(0, Math.min(255, 128 + n * 2.5));
    bImg.data[i] = bv;
    bImg.data[i + 1] = bv;
    bImg.data[i + 2] = bv;
  }
  actx.putImageData(aImg, 0, 0);
  bctx.putImageData(bImg, 0, 0);

  // Concrete edge curb shoulders
  const curbPx = 28;
  actx.fillStyle = isDayOrNatural ? '#94a3b8' : '#334155';
  actx.fillRect(0, 0, curbPx, height);
  actx.fillRect(width - curbPx, 0, curbPx, height);

  // Edge solid yellow/white bridge deck stripes
  actx.fillStyle = isDayOrNatural ? '#facc15' : '#38bdf8';
  actx.fillRect(curbPx, 0, 7, height);
  actx.fillStyle = isDayOrNatural ? '#f8fafc' : '#38bdf8';
  actx.fillRect(width - curbPx - 7, 0, 7, height);

  // Tire tracks across the 3 flyover lanes
  [0.2, 0.5, 0.8].forEach((uCenter) => {
    const cx = uCenter * width;
    [-22, 22].forEach((off) => {
      const grad = actx.createLinearGradient(cx + off - 14, 0, cx + off + 14, 0);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(0.5, 'rgba(10,12,16,0.34)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      actx.fillStyle = grad;
      actx.fillRect(cx + off - 14, 0, 28, height);
    });
  });

  // Bridge steel expansion joint seams (every 256px)
  [0, 256].forEach((jy) => {
    actx.fillStyle = 'rgba(15, 23, 42, 0.7)';
    actx.fillRect(0, jy, width, 6);
    actx.fillStyle = 'rgba(148, 163, 184, 0.45)';
    actx.fillRect(0, jy + 6, width, 3);
    bctx.fillStyle = 'rgb(40,40,40)';
    bctx.fillRect(0, jy, width, 6);
  });

  const makeTex = (canvas: HTMLCanvasElement, isColor: boolean) => {
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, repeatY);
    tex.anisotropy = maxAnisotropy;
    if (isColor) tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  };

  const map = makeTex(albedoCanvas, true);
  const bumpMap = makeTex(bumpCanvas, false);
  const roughnessMap = makeTex(roughCanvas, false);

  return {
    map,
    bumpMap,
    roughnessMap,
    repeatY,
    dispose: () => {
      map.dispose();
      bumpMap.dispose();
      roughnessMap.dispose();
    },
  };
}

/**
 * Generates wide roadside terrain ground plane texture so roads sit in a natural landscape.
 */
export function createTerrainTextureSet(
  theme: RoadTheme,
  maxAnisotropy: number
): TerrainTextureBundle {
  const size = 512;
  const repeatX = 16;
  const repeatY = 25;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  let bg = '#1e3a1e';
  let accent = '#2e5929';
  let gridLine: string | null = null;

  if (theme.skyType === 'daytime' || theme.skyType === 'coxsbazar_marine') {
    bg = '#2c4c27';
    accent = '#3f6a34';
  } else if (theme.skyType === 'sahara_sunset') {
    bg = '#6b4222';
    accent = '#8a562c';
  } else if (theme.skyType === 'magma') {
    bg = '#1c0907';
    accent = '#3a110a';
    gridLine = 'rgba(239, 68, 68, 0.25)';
  } else if (theme.skyType === 'space') {
    bg = '#05051a';
    accent = '#0d0b2e';
    gridLine = 'rgba(168, 85, 247, 0.28)';
  } else {
    // Cyber / Storm Rain urban pavement ground
    bg = '#0b101d';
    accent = '#131c31';
    gridLine = 'rgba(56, 189, 248, 0.14)';
  }

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  const rand = createSeededRandom(3103);
  for (let i = 0; i < 2400; i++) {
    ctx.fillStyle = i % 3 === 0 ? accent : 'rgba(0,0,0,0.12)';
    const x = rand() * size;
    const y = rand() * size;
    const w = 3 + rand() * 14;
    const h = 3 + rand() * 14;
    ctx.fillRect(x, y, w, h);
  }

  if (gridLine) {
    ctx.strokeStyle = gridLine;
    ctx.lineWidth = 2;
    const step = 64;
    for (let p = 0; p <= size; p += step) {
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, p);
      ctx.lineTo(size, p);
      ctx.stroke();
    }
  }

  const map = new THREE.CanvasTexture(canvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(repeatX, repeatY);
  map.anisotropy = maxAnisotropy;
  map.colorSpace = THREE.SRGBColorSpace;
  map.needsUpdate = true;

  return {
    map,
    repeatX,
    repeatY,
    dispose: () => map.dispose(),
  };
}

/**
 * Generates a soft dark radial contact shadow texture for grounding cars onto the tarmac.
 */
export function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 128, 12, 64, 128, 118);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.72)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.42)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 256);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

/**
 * Generates a soft dual headlight beam cone texture projected onto the asphalt ahead of the player car.
 */
export function createHeadlightBeamTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const drawBeam = (cx: number) => {
    const grad = ctx.createLinearGradient(cx, 500, cx, 10);
    grad.addColorStop(0, 'rgba(240, 248, 255, 0.46)');
    grad.addColorStop(0.35, 'rgba(215, 238, 255, 0.22)');
    grad.addColorStop(0.8, 'rgba(180, 225, 255, 0.06)');
    grad.addColorStop(1, 'rgba(180, 225, 255, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(cx - 12, 505);
    ctx.lineTo(cx + 12, 505);
    ctx.lineTo(cx + 76, 10);
    ctx.lineTo(cx - 76, 10);
    ctx.closePath();
    ctx.fill();
  };

  drawBeam(84);
  drawBeam(172);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}
