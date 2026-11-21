// Vice Cover — GTA 6-style cover art maker (make.fun gta6-cover-art-01).
// Node 22 program, standard library only. It hands the entry in: it copies
// the static web app (app/) and the screenshots (screenshots/) into the
// output directory and writes dossier.json there with the vendored make.fun
// dossier library. Run it twice and both runs write identical bytes.
//   MAKEFUN_OUTPUT_DIR=out node main.ts
// In the grader the output directory is /output.

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = resolve(fileURLToPath(new URL('.', import.meta.url)));
const outputDir = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');

const appDir = join(repoRoot, 'app');
const shotsDir = join(repoRoot, 'screenshots');

function fail(message: string): never {
  console.error(`main.ts: ${message}`);
  process.exit(1);
}

if (!existsSync(join(appDir, 'index.html'))) fail('app/index.html is missing');
if (!existsSync(shotsDir)) fail('screenshots/ is missing');

const shotFiles = readdirSync(shotsDir).filter((name) => !name.startsWith('.'));
if (shotFiles.length < 3 || shotFiles.length > 4) {
  fail(`screenshots/ must hold 3 or 4 images, found ${shotFiles.length}`);
}
for (const name of shotFiles) {
  const bytes = statSync(join(shotsDir, name)).size;
  if (bytes > 262144) fail(`screenshot ${name} is ${bytes} bytes, over the 256 KiB cap`);
}

// Start from a clean output directory so a second run writes the same bytes.
rmSync(outputDir, { recursive: true, force: true });
mkdirSync(outputDir, { recursive: true });
cpSync(appDir, join(outputDir, 'app'), { recursive: true });
cpSync(shotsDir, join(outputDir, 'screenshots'), { recursive: true });

// The dossier the judge reads: byte for byte what the library writes from
// the files just copied, within the scorer's caps.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);

console.log(`main.ts: wrote ${outputDir} (app/, screenshots/ x${shotFiles.length}, dossier.json ${dossier.length} bytes)`);
