// Electron entry used by the tests: starts the real app with its own data folder, runs one script
// in the page once the app is ready, and prints the result. Started by tests/run.mjs.
//
// Environment:
//   CAPNOTE_TEST_SCRIPT    file with the page script (an expression that evaluates to a promise)
//   CAPNOTE_TEST_USERDATA  data folder for this run
//   CAPNOTE_TEST_SAVE_PATH answer for the save dialog (PDF export)
//   CAPNOTE_TEST_SAVE_DIR  folder the save dialog answers with, keeping the suggested file name
//   CAPNOTE_TEST_SHOTS     folder for screenshots taken with console.log('__SHOT__:name')
//
// The page script can also print these markers:
//   __PICK__:["#selector", "path"]   fill an <input type=file> like the user picking that file
//   __FORCE__:["hover", "focus"]     force pseudo-classes on every element ([] clears them)
//   __KEYS__:["# Title", "^z"]       type through the real input path, like a keyboard: text is
//                                    typed key by key, "^z" is Ctrl+Z, "{Enter}" a key; then
//                                    window.__keysDone is set

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { app, BrowserWindow, dialog, shell } = require('electron');

const ROOT = path.join(__dirname, '..');
const env = process.env;
app.setPath('userData', env.CAPNOTE_TEST_USERDATA);

// The window stays out of sight; screenshots need it composited, so it is shown fully transparent
const realShow = BrowserWindow.prototype.show;
BrowserWindow.prototype.show = function () {
  if (!env.CAPNOTE_TEST_SHOTS) return;
  this.setOpacity(0);
  this.setSkipTaskbar(true);
  realShow.call(this);
};
shell.openExternal = async (url) => console.log('[openExternal] ' + url);
shell.openPath = async (file) => console.log('[openPath] ' + file);
if (env.CAPNOTE_TEST_SAVE_PATH) {
  dialog.showSaveDialog = async () => ({ canceled: false, filePath: env.CAPNOTE_TEST_SAVE_PATH });
}
if (env.CAPNOTE_TEST_SAVE_DIR) {
  // showSaveDialog(options) or showSaveDialog(window, options)
  dialog.showSaveDialog = async (...args) => {
    const options = args[args.length - 1] || {};
    let name = path.basename(String(options.defaultPath || 'file'));
    // CAPNOTE_TEST_SAVE_AS picks another file type in the dialog
    if (env.CAPNOTE_TEST_SAVE_AS)
      name = name.replace(/\.[^.]*$/, '') + '.' + env.CAPNOTE_TEST_SAVE_AS;
    return { canceled: false, filePath: path.join(env.CAPNOTE_TEST_SAVE_DIR, name) };
  };
  // Choosing a folder answers the save folder; choosing files answers every .md and .json in it
  dialog.showOpenDialog = async (...args) => {
    const options = args[args.length - 1] || {};
    if ((options.properties || []).includes('openDirectory')) {
      return { canceled: false, filePaths: [env.CAPNOTE_TEST_SAVE_DIR] };
    }
    const found = [];
    const walk = (dir) =>
      fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.(md|json)$/i.test(entry.name)) found.push(full);
      });
    walk(env.CAPNOTE_TEST_SAVE_DIR);
    return { canceled: false, filePaths: found };
  };
}

const logs = [];
const pending = [];
const finish = (result) => {
  process.stdout.write('\n__RESULT__' + JSON.stringify({ result, logs }) + '\n');
  app.exit(0);
};

async function withDebugger(wc, fn) {
  if (!wc.debugger.isAttached()) wc.debugger.attach('1.3');
  return fn((method, params) => wc.debugger.sendCommand(method, params));
}

function handleMarker(win, message) {
  const wc = win.webContents;
  if (message.startsWith('__SHOT__:')) {
    const name = message.slice(9);
    wc.invalidate();
    pending.push(
      new Promise((r) => setTimeout(r, 120))
        .then(() => wc.capturePage())
        .then((img) => {
          fs.writeFileSync(path.join(env.CAPNOTE_TEST_SHOTS, name + '.png'), img.toPNG());
          return wc.executeJavaScript(`window.__shotDone = ${JSON.stringify(name)}`);
        })
    );
    return true;
  }
  if (message.startsWith('__PICK__:')) {
    const [selector, file] = JSON.parse(message.slice(9));
    withDebugger(wc, async (send) => {
      const { root } = await send('DOM.getDocument');
      const { nodeId } = await send('DOM.querySelector', { nodeId: root.nodeId, selector });
      await send('DOM.setFileInputFiles', { nodeId, files: [file] });
    }).catch((err) => logs.push({ level: 'error', message: 'pick failed: ' + err }));
    return true;
  }
  if (message.startsWith('__KEYS__:')) {
    const steps = JSON.parse(message.slice(9));
    (async () => {
      win.focus();
      wc.focus();
      for (const step of steps) {
        const ctrl = step.match(/^\^(.+)$/);
        const named = step.match(/^\{(\w+)\}$/);
        if (ctrl || named) {
          const keyCode = ctrl ? ctrl[1].toUpperCase() : named[1];
          const modifiers = ctrl ? ['control'] : [];
          wc.sendInputEvent({ type: 'keyDown', keyCode, modifiers });
          if (named && named[1] === 'Enter') wc.sendInputEvent({ type: 'char', keyCode: '\r' });
          wc.sendInputEvent({ type: 'keyUp', keyCode, modifiers });
        } else {
          for (const ch of step) {
            wc.sendInputEvent({ type: 'keyDown', keyCode: ch });
            wc.sendInputEvent({ type: 'char', keyCode: ch });
            wc.sendInputEvent({ type: 'keyUp', keyCode: ch });
          }
        }
        await new Promise((r) => setTimeout(r, 60));
      }
      await new Promise((r) => setTimeout(r, 100));
      await wc.executeJavaScript('window.__keysDone = true');
    })().catch((err) => logs.push({ level: 'error', message: 'keys failed: ' + err }));
    return true;
  }
  if (message.startsWith('__FORCE__:')) {
    const states = JSON.parse(message.slice(10));
    withDebugger(wc, async (send) => {
      await send('DOM.enable');
      await send('CSS.enable');
      const { root } = await send('DOM.getDocument', { depth: -1 });
      const ids = [];
      const walk = (n) => {
        if (n.nodeType === 1) ids.push(n.nodeId);
        (n.children || []).forEach(walk);
      };
      walk(root);
      for (const nodeId of ids) {
        await send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: states }).catch(() => {});
      }
      await wc.executeJavaScript('window.__forced = true');
    }).catch((err) => logs.push({ level: 'error', message: 'force failed: ' + err }));
    return true;
  }
  return false;
}

// Only the app's main window runs the test; others (such as the PDF export window) are left alone
let mainWindowSeen = false;
app.on('browser-window-created', (_event, win) => {
  if (mainWindowSeen) return;
  mainWindowSeen = true;
  const wc = win.webContents;
  wc.setBackgroundThrottling(false);
  wc.on('console-message', (event) => {
    if (handleMarker(win, String(event.message))) return;
    logs.push({
      level: event.level,
      message: String(event.message),
      source: path.basename(String(event.sourceId || '')),
    });
  });
  wc.on('preload-error', (_e, _p, err) =>
    logs.push({ level: 'error', message: 'preload: ' + err })
  );
  wc.on('render-process-gone', (_e, details) =>
    logs.push({ level: 'error', message: 'renderer gone: ' + details.reason })
  );

  wc.once('did-finish-load', async () => {
    try {
      // Ready once the app has loaded its data and wired the page
      for (let i = 0; i < 200; i++) {
        if (
          await wc.executeJavaScript(
            '!!(window.app && window.app.notesList && window.app.settings)'
          )
        )
          break;
        await new Promise((r) => setTimeout(r, 50));
      }
      await new Promise((r) => setTimeout(r, 300));
      // Tests that build file paths by hand need to know where the data folder is
      await wc.executeJavaScript(
        `window.__testUserData = ${JSON.stringify(env.CAPNOTE_TEST_USERDATA)}`
      );
      const script = fs.readFileSync(env.CAPNOTE_TEST_SCRIPT, 'utf8');
      const result = await wc.executeJavaScript(script);
      await Promise.all(pending);
      finish({ ok: true, value: result === undefined ? null : result });
    } catch (err) {
      finish({ ok: false, error: String((err && err.stack) || err) });
    }
  });
});

const mainFile = path.join(ROOT, require(path.join(ROOT, 'package.json')).main);
import(pathToFileURL(mainFile).href).catch((err) =>
  finish({ ok: false, error: 'main failed: ' + err.stack })
);
