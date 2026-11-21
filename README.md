# Vice Cover

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/robertcaniago7/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/robertcaniago7/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Built for the [make.fun gta6-cover-art-01 bounty](https://make.fun/bounty/gta6-cover-art-01) — "Make GTA 6 Cover Art".

Vice Cover turns any photo and caption into GTA 6-style cover art: the
multi-panel poster look with bold caption lettering and a Vice City sunset or
neon colour grade, exported as a PNG to share. It runs entirely offline in a
desktop browser from its own static files — photos are read on your machine
and never uploaded anywhere.

## How it works

1. **Upload a photo** (or drag & drop one onto the preview, or try a sample).
   One photo fills every empty panel, each with its own crop, so a single
   click makes a full multi-panel cover. Upload again to replace one panel.
2. **Pick a layout** — 1, 2, 3 or 4 angled panels with thick white borders.
3. **Pick a colour grade** — Vice Sunset, Neon Night or Pastel Day.
4. **Pick an export size** — 1080 × 1080, 1080 × 1350 or 1920 × 1080.
5. **Write the caption** — a big bold title and a subtitle pill.
6. **Crop & position** — click a panel to select it, drag it to pan, scroll
   to zoom, or use the sliders. Then **Export PNG**.

## What is in the repo

- `app/` — the web app as static files (`index.html`, `style.css`,
  `src/cover.js` the canvas cover engine, `src/main.js` the editor UI,
  `fonts/` the bundled Anton display font under the SIL Open Font License,
  `samples/` three original illustrations drawn for this app).
- `screenshots/` — 4 screenshots: two covers the app exported and the editor
  with a photo loaded (first by name is the cover).
- `main.ts` — the Node 22 program that hands the entry in (copies `app/` and
  `screenshots/` to the output directory and writes `dossier.json`).
- `vendor/makefun-app.ts` — the kit's dossier library, unchanged.
- `shots.mjs` — the script that drives the app in headless Chromium and
  takes the screenshots (development tool, not part of the app).

## Run it

Serve `app/` with any static server and open `index.html` in desktop Chrome,
for example:

```sh
cd app && python3 -m http.server 8080
```

To hand the entry in (as the grader does):

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Originality

Everything here is the author's own: the app, the lettering, the sample
illustrations and the fonts. It uses no Rockstar Games logo, wordmark,
official artwork, character or font. Display type is Anton (SIL Open Font
License), bundled under `app/fonts/`.
