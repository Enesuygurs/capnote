// Shared by the test runners: starting the app with a page script, and comparing results

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const ELECTRON = require('electron');
export const TESTS_DIR = path.dirname(fileURLToPath(import.meta.url));
const TIMEOUT_MS = 300_000;

// Expected values match when equal; a RegExp tests a string, a function receives the value.
// Objects and arrays only need the listed keys; extra keys in the result are ignored.
export function compare(expected, actual, where, problems) {
  if (expected instanceof RegExp) {
    if (typeof actual !== 'string' || !expected.test(actual))
      problems.push(`${where}: ${JSON.stringify(actual)} does not match ${expected}`);
  } else if (typeof expected === 'function') {
    if (!expected(actual))
      problems.push(`${where}: ${JSON.stringify(actual)} fails ${expected.toString()}`);
  } else if (Array.isArray(expected)) {
    if (!Array.isArray(actual) || actual.length !== expected.length) {
      problems.push(`${where}: expected ${expected.length} items, got ${JSON.stringify(actual)}`);
      return;
    }
    expected.forEach((e, i) => compare(e, actual[i], `${where}[${i}]`, problems));
  } else if (expected && typeof expected === 'object') {
    if (!actual || typeof actual !== 'object') {
      problems.push(`${where}: expected an object, got ${JSON.stringify(actual)}`);
      return;
    }
    for (const key of Object.keys(expected))
      compare(expected[key], actual[key], `${where}.${key}`, problems);
  } else if (expected !== actual) {
    problems.push(`${where}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

// A function's source becomes a page script that resolves to its return value
export const asScript = (fn) => `(${fn.toString()})()`;

// Starts the app with its own data folder, runs the script in the page and resolves to
// { result: { ok, value | error }, logs }
export function launch({ script, userData, extraEnv = {} }) {
  const scriptFile = path.join(userData, '..', `${path.basename(userData)}-script.js`);
  fs.writeFileSync(scriptFile, script);
  const env = {
    ...process.env,
    ...extraEnv,
    CAPNOTE_TEST_SCRIPT: scriptFile,
    CAPNOTE_TEST_USERDATA: userData,
  };
  // When set, Electron runs as plain Node.js and opens no window
  delete env.ELECTRON_RUN_AS_NODE;
  return new Promise((resolve) => {
    const child = spawn(ELECTRON, [path.join(TESTS_DIR, 'harness.cjs')], { env });
    let out = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', () => {});
    const timer = setTimeout(() => child.kill(), TIMEOUT_MS);
    child.on('exit', () => {
      clearTimeout(timer);
      const line = out.split('\n').find((l) => l.startsWith('__RESULT__'));
      resolve(
        line
          ? JSON.parse(line.slice(10))
          : { result: { ok: false, error: 'no result (timed out or crashed)' }, logs: [] }
      );
    });
  });
}
