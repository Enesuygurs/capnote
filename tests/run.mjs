// Runs the app tests: each tests/cases/*.test.mjs starts the real app with an empty data folder,
// runs its page script and compares the result with what it expects.
//
//   npm test                 all tests
//   npm test -- search lock  only tests whose file name contains one of the words
//   npm test -- --print      also print every result (useful when writing a test)

import fs from 'fs';
import os from 'os';
import path from 'path';
import { pathToFileURL } from 'url';
import { TESTS_DIR, compare, asScript, launch } from './lib.mjs';

const CASES_DIR = path.join(TESTS_DIR, 'cases');

async function runCase(file, scratch) {
  const test = await import(pathToFileURL(file).href);
  const name = path.basename(file, '.test.mjs');
  const userData = path.join(scratch, name);
  fs.rmSync(userData, { recursive: true, force: true });
  fs.mkdirSync(userData, { recursive: true });
  const extraEnv = {};
  if (test.savePath)
    extraEnv.CAPNOTE_TEST_SAVE_PATH = path.join(scratch, `${name}-${test.savePath}`);

  if (test.seed) {
    const seeded = await launch({ script: asScript(test.seed), userData, extraEnv });
    if (!seeded.result.ok) return { name, problems: ['seed failed: ' + seeded.result.error] };
    // Upgrade tests: drop the data files so the next start finds only what an older version left
    if (test.upgradeAfterSeed) {
      for (const dir of ['data', 'backups'])
        fs.rmSync(path.join(userData, dir), { recursive: true, force: true });
    }
  }
  const { result, logs } = await launch({ script: asScript(test.run), userData, extraEnv });
  const problems = [];
  if (!result.ok) problems.push('threw: ' + result.error.split('\n').slice(0, 3).join(' | '));
  else compare(test.expected, result.value, 'result', problems);

  const allowed = test.allowedErrors || [];
  logs
    .filter((l) => l.level === 'error' || l.level === 3)
    .filter((l) => !allowed.some((re) => re.test(l.message)))
    .forEach((l) => problems.push(`console error: ${l.message.slice(0, 200)} (${l.source || ''})`));
  return { name, problems, value: result.value };
}

const args = process.argv.slice(2);
const print = args.includes('--print');
const filters = args.filter((a) => !a.startsWith('--'));
const files = fs
  .readdirSync(CASES_DIR)
  .filter((f) => f.endsWith('.test.mjs'))
  .filter((f) => !filters.length || filters.some((w) => f.includes(w)))
  .sort()
  .map((f) => path.join(CASES_DIR, f));

const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'capnote-tests-'));
let failed = 0;
const started = Date.now();
for (const file of files) {
  const t0 = Date.now();
  const { name, problems, value } = await runCase(file, scratch);
  const seconds = ((Date.now() - t0) / 1000).toFixed(1);
  if (problems.length) {
    failed++;
    console.log(`FAIL ${name} (${seconds}s)`);
    problems.forEach((p) => console.log('     ' + p));
  } else {
    console.log(`ok   ${name} (${seconds}s)`);
  }
  if (print) console.log('     ' + JSON.stringify(value));
}
fs.rmSync(scratch, { recursive: true, force: true });
console.log(
  `\n${files.length - failed} passed, ${failed} failed in ${((Date.now() - started) / 1000).toFixed(0)}s`
);
process.exit(failed ? 1 : 0);
