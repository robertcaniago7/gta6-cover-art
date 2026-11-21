// Vice Cover — cover rendering engine.
// Draws a GTA-style multi-panel poster cover on a <canvas> from a state
// object. Pure canvas 2D, no libraries, no network. The same function draws
// the live preview and the exported PNG (only the pixel size differs).
//
// state = {
//   layout: 'single' | 'duo' | 'trio' | 'quad',
//   grade: 'sunset' | 'neon' | 'day',
//   title: string, subtitle: string,
//   panels: [{ img: HTMLImageElement | null, zoom: number, ox: number, oy: number }]
// }

export const EXPORT_SIZES = {
  square: { label: 'Square · 1080 × 1080', width: 1080, height: 1080 },
  portrait: { label: 'Portrait · 1080 × 1350', width: 1080, height: 1350 },
  wide: { label: 'Wide · 1920 × 1080', width: 1920, height: 1080 },
};

export const GRADES = {
  sunset: { label: 'Vice Sunset', accent: '#ff5e62', stops: ['#ff9a3c', '#ff5e62', '#a044ff'], vignette: 0.28 },
  neon: { label: 'Neon Night', accent: '#ff2ea6', stops: ['#ff2ea6', '#7c3aed', '#2ec5ff'], vignette: 0.36 },
  day: { label: 'Pastel Day', accent: '#0ea5e9', stops: ['#7dd3fc', '#fbcfe8', '#fde68a'], vignette: 0.16 },
};

// Panel rectangles per layout, in fractions of the cover (x, y, w, h, rotation deg).
const LAYOUTS = {
  single: [{ x: 0, y: 0, w: 1, h: 1, rot: 0 }],
  duo: [
    { x: -0.02, y: -0.02, w: 0.58, h: 1.04, rot: -2.5 },
    { x: 0.44, y: -0.02, w: 0.58, h: 1.04, rot: 2.5 },
  ],
  trio: [
    { x: -0.02, y: -0.02, w: 1.04, h: 0.6, rot: -1.5 },
    { x: -0.02, y: 0.56, w: 0.52, h: 0.46, rot: 1.5 },
    { x: 0.5, y: 0.56, w: 0.52, h: 0.46, rot: -1.5 },
  ],
  quad: [
    { x: -0.02, y: -0.02, w: 0.52, h: 0.52, rot: -2 },
    { x: 0.5, y: -0.02, w: 0.52, h: 0.52, rot: 2 },
    { x: -0.02, y: 0.5, w: 0.52, h: 0.52, rot: 2 },
    { x: 0.5, y: 0.5, w: 0.52, h: 0.52, rot: -2 },
  ],
};

export function panelCount(layout) {
  return LAYOUTS[layout].length;
}

export function panelRects(layout, width, height) {
  return LAYOUTS[layout].map((p) => ({
    x: p.x * width,
    y: p.y * height,
    w: p.w * width,
    h: p.h * height,
    rot: (p.rot * Math.PI) / 180,
  }));
}

// Cover-fit an image into a rectangle, with a zoom factor and a pan offset
// (ox, oy in fractions of the rectangle, -0.35..0.35).
function drawPhotoInto(ctx, img, rect, zoom, ox, oy) {
  const base = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight);
  const scale = base * zoom;
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const dx = rect.x + (rect.w - dw) / 2 + ox * rect.w;
  const dy = rect.y + (rect.h - dh) / 2 + oy * rect.h;
  ctx.drawImage(img, dx, dy, dw, dh);
}

function emptyPanelFill(ctx, rect, grade) {
  const g = GRADES[grade];
  const grad = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
  grad.addColorStop(0, g.stops[0]);
  grad.addColorStop(0.55, g.stops[1]);
  grad.addColorStop(1, g.stops[2]);
  ctx.fillStyle = grad;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  // Diagonal sheen so an empty panel still reads as a designed panel.
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  ctx.beginPath();
  ctx.moveTo(rect.x, rect.y + rect.h);
  ctx.lineTo(rect.x + rect.w * 0.55, rect.y);
  ctx.lineTo(rect.x + rect.w * 0.8, rect.y);
  ctx.lineTo(rect.x + rect.w * 0.25, rect.y + rect.h);
  ctx.closePath();
  ctx.fill();
}

function drawPanel(ctx, rect, photo, grade, forExport, width) {
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rect.rot);
  ctx.translate(-cx, -cy);

  // Drop shadow under the panel.
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = width * 0.012;
  ctx.shadowOffsetY = width * 0.008;
  ctx.fillStyle = '#111';
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // Photo (or gradient) clipped to the panel.
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  if (photo && photo.img) {
    drawPhotoInto(ctx, photo.img, rect, photo.zoom, photo.ox, photo.oy);
  } else {
    emptyPanelFill(ctx, rect, grade);
    if (!forExport) {
      // Hint near the top of the panel so it never collides with the title.
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.font = `700 ${Math.round(width * 0.028)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('+ ADD PHOTO', cx, rect.y + rect.h * 0.3);
    }
  }
  ctx.restore();

  // Thick white border, GTA-poster style.
  ctx.lineWidth = Math.max(2, width * 0.007);
  ctx.strokeStyle = '#ffffff';
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}

let halftonePattern = null;
function halftone(ctx, width, height) {
  if (!halftonePattern) {
    const tile = document.createElement('canvas');
    tile.width = 14;
    tile.height = 14;
    const t = tile.getContext('2d');
    t.fillStyle = 'rgba(0,0,0,0.55)';
    t.beginPath();
    t.arc(7, 7, 1.6, 0, Math.PI * 2);
    t.fill();
    halftonePattern = ctx.createPattern(tile, 'repeat');
  }
  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = halftonePattern;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

function gradeOverlay(ctx, width, height, grade) {
  const g = GRADES[grade];
  const grad = ctx.createLinearGradient(0, 0, width * 0.7, height);
  grad.addColorStop(0, g.stops[0]);
  grad.addColorStop(0.55, g.stops[1]);
  grad.addColorStop(1, g.stops[2]);
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  // Vignette: darken the corners so the lettering pops.
  const v = ctx.createRadialGradient(
    width / 2, height / 2, Math.min(width, height) * 0.42,
    width / 2, height / 2, Math.max(width, height) * 0.75,
  );
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, `rgba(0,0,0,${g.vignette})`);
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, width, height);
  halftone(ctx, width, height);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawLettering(ctx, width, height, grade, title, subtitle) {
  const g = GRADES[grade];
  const text = (title || 'VICE CITY').toUpperCase();
  const fontSize = Math.round(height * 0.104);
  ctx.save();
  ctx.font = `${fontSize}px Anton, 'Arial Black', sans-serif`;
  ctx.textBaseline = 'alphabetic';

  // Wrap the title into at most two lines.
  let lines = [text];
  const maxW = width * 0.92;
  if (ctx.measureText(text).width > maxW) {
    const words = text.split(' ');
    let first = '';
    let rest = '';
    for (const w of words) {
      if (!first) {
        first = w;
      } else if (ctx.measureText(`${first} ${w}`).width <= maxW * 0.62) {
        first += ` ${w}`;
      } else {
        rest = rest ? `${rest} ${w}` : w;
      }
    }
    lines = rest ? [first, rest] : [first];
  }
  const lineH = fontSize * 0.98;
  const titleH = lines.length * lineH;
  const anchorX = width * 0.05;
  const anchorY = height * 0.9;

  // Dark scrim behind the lettering so it reads over any photo.
  const scrim = ctx.createLinearGradient(0, height * 0.62, 0, height);
  scrim.addColorStop(0, 'rgba(0,0,0,0)');
  scrim.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, height * 0.62, width, height * 0.38);

  ctx.translate(anchorX, anchorY);
  ctx.rotate(-0.035);
  ctx.textAlign = 'left';
  ctx.lineJoin = 'round';
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = height * 0.012;
  ctx.shadowOffsetY = height * 0.006;
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#111111';
  ctx.lineWidth = fontSize * 0.09;
  lines.forEach((line, i) => {
    const y = -(titleH - lineH) + i * lineH;
    ctx.strokeText(line, 0, y);
    ctx.fillText(line, 0, y);
  });
  // Accent underline bar under the title.
  const titleW = Math.max(...lines.map((l) => ctx.measureText(l).width));
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.fillStyle = g.accent;
  ctx.fillRect(0, lineH * 0.28, titleW * 0.62, Math.max(3, height * 0.011));
  ctx.restore();

  // Subtitle pill above the title; shrink the font until it fits.
  // Measure the UPPERCASE text (that is what gets drawn).
  const sub = (subtitle || '').trim().toUpperCase();
  if (sub) {
    let pillFont = Math.round(height * 0.03);
    ctx.save();
    ctx.font = `700 ${pillFont}px system-ui, sans-serif`;
    const padX = pillFont * 0.9;
    while (ctx.measureText(sub).width + padX * 2 > width * 0.88 && pillFont > 10) {
      pillFont -= 2;
      ctx.font = `700 ${pillFont}px system-ui, sans-serif`;
    }
    const pillW = ctx.measureText(sub).width + padX * 2;
    const pillH = pillFont * 2.1;
    const px = width * 0.05;
    const py = anchorY - titleH - pillH - height * 0.028;
    ctx.translate(px, py);
    ctx.rotate(-0.035);
    ctx.fillStyle = g.accent;
    roundRect(ctx, 0, 0, pillW, pillH, pillH / 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(sub, padX, pillH / 2 + 1);
    ctx.restore();
  }
}

// Draw the whole cover. `forExport` hides the editor-only "+ ADD PHOTO" hints.
export function renderCover(canvas, state, sizeKey, forExport = false) {
  const size = EXPORT_SIZES[sizeKey] || EXPORT_SIZES.square;
  const dpr = forExport ? 1 : Math.min(window.devicePixelRatio || 1, 2);
  const scale = forExport ? 1 : Math.min(1, 900 / size.width);
  canvas.width = Math.round(size.width * (forExport ? 1 : scale * dpr));
  canvas.height = Math.round(size.height * (forExport ? 1 : scale * dpr));
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  // Base: deep charcoal so panel gaps read as a designed frame.
  ctx.fillStyle = '#0d0d12';
  ctx.fillRect(0, 0, w, h);

  const rects = panelRects(state.layout, w, h);
  rects.forEach((rect, i) => {
    drawPanel(ctx, rect, state.panels[i], state.grade, forExport, w);
  });
  gradeOverlay(ctx, w, h, state.grade);
  drawLettering(ctx, w, h, state.grade, state.title, state.subtitle);
  return canvas;
}

// Hit-test the preview canvas: which panel (topmost first) is at (x, y)?
export function hitPanel(state, sizeKey, x, y, canvasW, canvasH) {
  const size = EXPORT_SIZES[sizeKey] || EXPORT_SIZES.square;
  const w = canvasW;
  const h = canvasH;
  const rects = panelRects(state.layout, w, h);
  for (let i = rects.length - 1; i >= 0; i -= 1) {
    const r = rects[i];
    // Undo the panel rotation around its centre.
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    const cos = Math.cos(-r.rot);
    const sin = Math.sin(-r.rot);
    const dx = x - cx;
    const dy = y - cy;
    const lx = dx * cos - dy * sin + cx;
    const ly = dx * sin + dy * cos + cy;
    if (lx >= r.x && lx <= r.x + r.w && ly >= r.y && ly <= r.y + r.h) return i;
  }
  return -1;
}
