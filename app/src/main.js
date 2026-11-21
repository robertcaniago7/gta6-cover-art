// Vice Cover — UI wiring.
// Owns the editor state, binds every control, and re-renders the live
// preview through the cover engine (cover.js). Photos are read on this
// machine only (FileReader / object URLs) and never uploaded anywhere.

import { EXPORT_SIZES, GRADES, panelCount, renderCover, hitPanel } from './cover.js';

const SAMPLES = [
  { name: 'Sunset Blvd', src: 'samples/sunset.jpg' },
  { name: 'Neon Pier', src: 'samples/neon.jpg' },
  { name: 'Pastel City', src: 'samples/city.jpg' },
];

const state = {
  layout: 'trio',
  grade: 'sunset',
  size: 'square',
  title: 'NEON CITY',
  subtitle: 'Welcome back',
  panels: [],
  selected: 0,
};

const $ = (id) => document.getElementById(id);
const preview = $('preview');
const fileInput = $('file-input');

function blankPanel() {
  return { img: null, zoom: 1, ox: 0, oy: 0 };
}

function ensurePanels() {
  const n = panelCount(state.layout);
  while (state.panels.length < n) state.panels.push(blankPanel());
  state.panels.length = n;
  if (state.selected >= n) state.selected = 0;
}

function render() {
  ensurePanels();
  renderCover(preview, state, state.size, false);
  updatePanelControls();
  document.querySelectorAll('[data-layout]').forEach((b) => {
    b.classList.toggle('active', b.dataset.layout === state.layout);
  });
  document.querySelectorAll('[data-grade]').forEach((b) => {
    b.classList.toggle('active', b.dataset.grade === state.grade);
  });
  document.querySelectorAll('[data-size]').forEach((b) => {
    b.classList.toggle('active', b.dataset.size === state.size);
  });
  document.querySelectorAll('.sample-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.sample === state.activeSample);
  });
  $('panel-label').textContent = `Panel ${state.selected + 1} of ${panelCount(state.layout)}`;
}

function updatePanelControls() {
  const p = state.panels[state.selected] || blankPanel();
  $('zoom').value = p.zoom;
  $('pan-x').value = p.ox;
  $('pan-y').value = p.oy;
  $('zoom-val').textContent = `${Math.round(p.zoom * 100)}%`;
  $('pan-x-val').textContent = p.ox.toFixed(2);
  $('pan-y-val').textContent = p.oy.toFixed(2);
  const hasPhoto = !!p.img;
  $('zoom').disabled = !hasPhoto;
  $('pan-x').disabled = !hasPhoto;
  $('pan-y').disabled = !hasPhoto;
  $('clear-panel').disabled = !hasPhoto;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${src}`));
    img.src = src;
  });
}

async function assignPhoto(img, targetIndex) {
  ensurePanels();
  // A new photo fills every empty panel (one photo, several panels, each
  // with its own crop — the GTA poster look), so one click makes a full
  // cover. When no panel is empty it replaces the selected panel only.
  const empty = state.panels.map((p, i) => (p.img ? -1 : i)).filter((i) => i >= 0);
  const targets = targetIndex !== undefined && targetIndex !== null
    ? [targetIndex]
    : (empty.length ? empty : [state.selected]);
  for (const idx of targets) {
    const v = CROP_VARIATIONS[idx % CROP_VARIATIONS.length];
    state.panels[idx] = { img, zoom: v.zoom, ox: v.ox, oy: v.oy };
  }
  state.selected = targets[0];
  state.activeSample = null;
  render();
}

// A different crop of the same photo per panel, so one photo reads as
// several shots across the poster.
const CROP_VARIATIONS = [
  { zoom: 1.0, ox: 0, oy: 0 },
  { zoom: 1.25, ox: -0.08, oy: -0.03 },
  { zoom: 1.2, ox: 0.08, oy: -0.04 },
  { zoom: 1.35, ox: 0, oy: -0.06 },
];

async function loadSample(name) {
  const sample = SAMPLES.find((s) => s.name === name);
  if (!sample) return;
  try {
    const img = await loadImage(sample.src);
    state.activeSample = name;
    await assignPhoto(img);
  } catch (err) {
    showToast(`Sample photo failed to load (${sample.src})`);
  }
}

function showToast(message) {
  const toast = $('toast');
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 2600);
}

function bindControls() {
  // Upload: file picker + drag & drop onto the preview.
  $('upload-btn').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async () => {
    for (const file of fileInput.files) {
      if (!file.type.startsWith('image/')) continue;
      try {
        const img = await loadImage(URL.createObjectURL(file));
        await assignPhoto(img);
      } catch (err) {
        showToast(`Could not read ${file.name}`);
      }
    }
    fileInput.value = '';
  });
  ['dragover', 'dragenter'].forEach((ev) => {
    preview.addEventListener(ev, (e) => {
      e.preventDefault();
      preview.classList.add('drop');
    });
  });
  ['dragleave', 'drop'].forEach((ev) => {
    preview.addEventListener(ev, (e) => {
      e.preventDefault();
      preview.classList.remove('drop');
    });
  });
  preview.addEventListener('drop', async (e) => {
    for (const file of e.dataTransfer.files) {
      if (!file.type.startsWith('image/')) continue;
      try {
        const img = await loadImage(URL.createObjectURL(file));
        await assignPhoto(img);
      } catch (err) {
        showToast(`Could not read ${file.name}`);
      }
    }
  });

  // Sample photos.
  document.querySelectorAll('.sample-btn').forEach((b) => {
    b.addEventListener('click', () => loadSample(b.dataset.sample));
  });

  // Layout, grade, size.
  document.querySelectorAll('[data-layout]').forEach((b) => {
    b.addEventListener('click', () => {
      state.layout = b.dataset.layout;
      render();
    });
  });
  document.querySelectorAll('[data-grade]').forEach((b) => {
    b.addEventListener('click', () => {
      state.grade = b.dataset.grade;
      render();
    });
  });
  document.querySelectorAll('[data-size]').forEach((b) => {
    b.addEventListener('click', () => {
      state.size = b.dataset.size;
      render();
    });
  });

  // Caption.
  $('title-input').addEventListener('input', (e) => {
    state.title = e.target.value;
    render();
  });
  $('subtitle-input').addEventListener('input', (e) => {
    state.subtitle = e.target.value;
    render();
  });

  // Selected panel: click the preview, drag to pan, wheel to zoom.
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  preview.addEventListener('pointerdown', (e) => {
    const rect = preview.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * preview.width;
    const y = ((e.clientY - rect.top) / rect.height) * preview.height;
    const hit = hitPanel(state, state.size, x, y, preview.width, preview.height);
    if (hit >= 0) {
      state.selected = hit;
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      preview.setPointerCapture(e.pointerId);
      render();
    }
  });
  preview.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const p = state.panels[state.selected];
    if (!p || !p.img) return;
    const rect = preview.getBoundingClientRect();
    p.ox += ((e.clientX - lastX) / rect.width) * 0.9;
    p.oy += ((e.clientY - lastY) / rect.height) * 0.9;
    p.ox = Math.max(-0.35, Math.min(0.35, p.ox));
    p.oy = Math.max(-0.35, Math.min(0.35, p.oy));
    lastX = e.clientX;
    lastY = e.clientY;
    render();
  });
  preview.addEventListener('pointerup', () => {
    dragging = false;
  });
  preview.addEventListener('wheel', (e) => {
    e.preventDefault();
    const p = state.panels[state.selected];
    if (!p || !p.img) return;
    p.zoom = Math.max(1, Math.min(2.5, p.zoom * (e.deltaY < 0 ? 1.08 : 0.93)));
    render();
  }, { passive: false });

  // Sliders for the selected panel.
  $('zoom').addEventListener('input', (e) => {
    const p = state.panels[state.selected];
    if (!p) return;
    p.zoom = parseFloat(e.target.value);
    render();
  });
  $('pan-x').addEventListener('input', (e) => {
    const p = state.panels[state.selected];
    if (!p) return;
    p.ox = parseFloat(e.target.value);
    render();
  });
  $('pan-y').addEventListener('input', (e) => {
    const p = state.panels[state.selected];
    if (!p) return;
    p.oy = parseFloat(e.target.value);
    render();
  });
  $('clear-panel').addEventListener('click', () => {
    const p = state.panels[state.selected];
    if (!p) return;
    state.panels[state.selected] = blankPanel();
    render();
  });

  // Export.
  $('export-btn').addEventListener('click', () => {
    const size = EXPORT_SIZES[state.size];
    const off = document.createElement('canvas');
    renderCover(off, state, state.size, true);
    off.toBlob((blob) => {
      if (!blob) {
        showToast('Export failed — please try again');
        return;
      }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `vice-cover-${state.size}-${size.width}x${size.height}.png`;
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      showToast(`Exported ${size.width} × ${size.height} PNG`);
    }, 'image/png');
  });
}

async function init() {
  bindControls();
  ensurePanels();
  // Wait for the display font so the first preview already has real lettering.
  try {
    await document.fonts.load('100px Anton');
  } catch (err) {
    // Falls back to Arial Black in the engine; the cover still renders.
  }
  await loadSample('Sunset Blvd');
  render();
}

init();
