// Vice Cover — screenshot + smoke-test script.
// Serves app/ over a local static server, opens it in headless Chromium,
// drives it like a user (loads samples, switches layouts/grades, exports),
// and writes 4 screenshots into screenshots/:
//   1-cover.jpg          exported wide cover (the PNG the app wrote)
//   2-editor.jpg         the editor with a photo loaded
//   3-cover-portrait.jpg exported portrait cover (the PNG the app wrote)
//   4-editor-quad.jpg    the editor, quad layout + neon grade
// Also fails loudly on console errors or a missing canvas render.
// Run: node shots.mjs   (needs the playwright package from the cartoon-short
// projects; set PLAYWRIGHT_NODE_MODULES to its folder if different)

import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(join(process.env.PLAYWRIGHT_NODE_MODULES
  ?? '/home/hatch/workspace/shorts/eiffel-tower/node_modules', 'playwright', 'package.json'));
const { chromium } = require('playwright');

const here = resolve(fileURLToPath(new URL('.', import.meta.url)));
const appDir = join(here, 'app');
const shotsDir = join(here, 'screenshots');
const tmpDir = '/tmp/vice-cover-shots';

const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.mjs': 'text/javascript', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.png': 'image/png', '.woff2': 'font/woff2',
};

function serve() {
  return new Promise((resolveServer) => {
    const server = createServer(async (req, res) => {
      try {
        const path = req.url === '/' ? '/index.html' : decodeURIComponent(req.url.split('?')[0]);
        const file = join(appDir, path);
        const data = await readFile(file);
        res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
        res.end(data);
      } catch {
        res.writeHead(404);
        res.end('not found');
      }
    });
    server.listen(0, '127.0.0.1', () => resolveServer(server));
  });
}

async function shot(page, name, opts) {
  const file = join(shotsDir, name);
  await page.screenshot({ path: file, type: 'jpeg', quality: 86, ...opts });
  console.log('saved', name);
}

async function exportPng(page, context) {
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 15000 }),
    page.click('#export-btn'),
  ]);
  const file = join(tmpDir, download.suggestedFilename());
  await download.saveAs(file);
  return file;
}

async function coverShot(browser, pngFile, outName, viewW, viewH) {
  const page = await browser.newPage({ viewport: { width: viewW, height: viewH } });
  const data = await readFile(pngFile);
  const html = `<!doctype html><html><head><style>html,body{margin:0;background:#0d0d12;height:100%}img{display:block;width:100%;height:100%;object-fit:contain}</style></head><body><img src="data:image/png;base64,${data.toString('base64')}"></body></html>`;
  await page.setContent(html);
  await page.waitForTimeout(300);
  await shot(page, outName, {});
  await page.close();
}

async function main() {
  await mkdir(shotsDir, { recursive: true });
  await mkdir(tmpDir, { recursive: true });
  const server = await serve();
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}/`;
  console.log('serving', base);

  const browser = await chromium.launch({
    args: ['--disable-gpu', '--disable-dev-shm-usage', '--no-sandbox'],
  });
  const errors = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(String(err)));

    await page.goto(base, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => {
      const c = document.getElementById('preview');
      return c && c.width > 0 && document.fonts.check("100px Anton");
    }, { timeout: 20000 });
    await page.waitForTimeout(800);

    // 2-editor: trio layout, sunset grade, sample loaded (default state).
    await shot(page, '2-editor.jpg', {});

    // 1-cover: export the wide cover, screenshot the PNG the app wrote.
    await page.click('[data-size="wide"]');
    await page.waitForTimeout(400);
    const widePng = await exportPng(page, browser);
    console.log('exported', widePng);

    // 3-cover-portrait: portrait size, neon grade, quad layout, another sample.
    await page.click('[data-size="portrait"]');
    await page.click('[data-grade="neon"]');
    await page.click('[data-layout="quad"]');
    await page.click('[data-sample="Neon Pier"]');
    await page.fill('#title-input', 'NEON NIGHTS');
    await page.fill('#subtitle-input', 'Neon City after dark');
    await page.waitForTimeout(500);
    const portraitPng = await exportPng(page, browser);
    console.log('exported', portraitPng);

    // 4-editor-quad: the editor itself in that state.
    await shot(page, '4-editor-quad.jpg', {});

    // Covers from the PNGs the app wrote.
    await coverShot(browser, widePng, '1-cover.jpg', 1280, 720);
    await coverShot(browser, portraitPng, '3-cover-portrait.jpg', 1024, 1280);

    // Back to the default trio/sunset for a clean final editor state check.
    await page.click('[data-layout="trio"]');
    await page.click('[data-grade="sunset"]');
    await page.click('[data-sample="Sunset Blvd"]');
    await page.waitForTimeout(400);
    const canvasOk = await page.evaluate(() => {
      const c = document.getElementById('preview');
      const ctx = c.getContext('2d');
      const data = ctx.getImageData(0, 0, c.width, c.height).data;
      let nonBlank = 0;
      for (let i = 0; i < data.length; i += 401) if (data[i] + data[i + 1] + data[i + 2] > 30) nonBlank += 1;
      return nonBlank > 100;
    });
    console.log('preview canvas has painted pixels:', canvasOk);
    if (!canvasOk) errors.push('preview canvas looks blank');
  } finally {
    await browser.close();
    server.close();
  }

  if (errors.length) {
    console.error('CONSOLE/PAGE ERRORS:', errors);
    process.exit(1);
  }
  console.log('shots done, no console errors');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
