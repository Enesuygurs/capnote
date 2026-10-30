// Screenshot comparison: captures every screen of tests/visual-screens.mjs and compares each with the
// accepted screenshot from an earlier run. Font rendering differs between machines, so the accepted
// screenshots stay on this machine (tests/visual/accepted, not in git).
//
//   npm run test:visual               compare with the accepted screenshots
//   npm run test:visual -- --accept   accept the current screenshots (first run, or after a wanted change)
//
// Differences are written to tests/visual/diff as images with the changed pixels in red.

import fs from 'fs';
import os from 'os';
import path from 'path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { TESTS_DIR, asScript, launch } from './lib.mjs';
import * as screens from './visual-screens.mjs';

const OUT = path.join(TESTS_DIR, 'visual');
const CURRENT = path.join(OUT, 'current');
const ACCEPTED = path.join(OUT, 'accepted');
const DIFF = path.join(OUT, 'diff');
const accept = process.argv.includes('--accept');

for (const dir of [CURRENT, DIFF]) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'capnote-visual-'));
const userData = path.join(scratch, 'screens');
fs.mkdirSync(userData);

const seeded = await launch({ script: asScript(screens.seed), userData });
const captured = seeded.result.ok
  ? await launch({
      script: asScript(screens.run),
      userData,
      extraEnv: { CAPNOTE_TEST_SHOTS: CURRENT },
    })
  : seeded;
fs.rmSync(scratch, { recursive: true, force: true });
if (!captured.result.ok) {
  console.log('Capturing failed: ' + captured.result.error);
  process.exit(1);
}

const shots = fs
  .readdirSync(CURRENT)
  .filter((f) => f.endsWith('.png'))
  .sort();
console.log(`${shots.length} screenshots`);
if (accept || !fs.existsSync(ACCEPTED)) {
  fs.rmSync(ACCEPTED, { recursive: true, force: true });
  fs.cpSync(CURRENT, ACCEPTED, { recursive: true });
  console.log(
    accept ? 'Accepted the current screenshots.' : 'No accepted screenshots yet; accepted these.'
  );
  process.exit(0);
}

let changed = 0;
for (const file of shots) {
  const acceptedFile = path.join(ACCEPTED, file);
  if (!fs.existsSync(acceptedFile)) {
    console.log(`NEW  ${file}`);
    changed++;
    continue;
  }
  const a = PNG.sync.read(fs.readFileSync(acceptedFile));
  const b = PNG.sync.read(fs.readFileSync(path.join(CURRENT, file)));
  if (a.width !== b.width || a.height !== b.height) {
    console.log(`SIZE ${file}`);
    changed++;
    continue;
  }
  const diff = new PNG({ width: a.width, height: a.height });
  const pixels = pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold: 0.05 });
  if (pixels > 0) {
    console.log(`DIFF ${file}: ${pixels} px`);
    fs.writeFileSync(path.join(DIFF, file), PNG.sync.write(diff));
    changed++;
  }
}
for (const file of fs.readdirSync(ACCEPTED).filter((f) => f.endsWith('.png'))) {
  if (!shots.includes(file)) {
    console.log(`GONE ${file}`);
    changed++;
  }
}
console.log(changed ? `${changed} screenshot(s) differ` : 'All screenshots match.');
process.exit(changed ? 1 : 0);
