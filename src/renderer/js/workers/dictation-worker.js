// Speech to text for dictation, in a worker so the page stays responsive. Whisper runs on this
// computer: the model is downloaded from Hugging Face the first time it is used and then kept in
// IndexedDB, so dictation works offline afterwards and no audio leaves the computer.
//
// Messages in:  { type: 'load', model } to get the model ready while the user speaks,
//               { type: 'transcribe', audio: Float32Array (16 kHz mono), model, language }
// Messages out: { type: 'progress', percent } while the model downloads,
//               { type: 'result', text } or { type: 'error', message }

import {
  pipeline,
  env,
} from '../../../../node_modules/@huggingface/transformers/dist/transformers.min.js';

env.allowLocalModels = false;
// The ONNX runtime's WebAssembly files come with the app instead of from a CDN
env.backends.onnx.wasm.wasmPaths = new URL(
  '../../../../node_modules/onnxruntime-web/dist/',
  import.meta.url
).href;

// The browser cache is not available to a page loaded from a file, so the downloaded model files
// are kept in IndexedDB instead (one record per file URL)
const DB_NAME = 'capnote-dictation';
const STORE = 'files';
let db = null;

function openDb() {
  if (db) return db;
  db = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return db;
}

async function inStore(mode, run) {
  const database = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE, mode);
    const request = run(transaction.objectStore(STORE));
    transaction.oncomplete = () => resolve(request.result);
    transaction.onerror = () => reject(transaction.error);
  });
}

env.useBrowserCache = false;
env.useCustomCache = true;
env.customCache = {
  async match(request) {
    const key = typeof request === 'string' ? request : request.url;
    const data = await inStore('readonly', (store) => store.get(key));
    return data
      ? new Response(data, { headers: { 'content-length': String(data.byteLength) } })
      : undefined;
  },
  async put(request, response) {
    const key = typeof request === 'string' ? request : request.url;
    const data = await response.arrayBuffer();
    await inStore('readwrite', (store) => store.put(data, key));
  },
};

const MODELS = {
  accurate: 'onnx-community/whisper-small',
  fast: 'onnx-community/whisper-base',
};

// The model being loaded or ready, so a load and a transcription asked at once share one download
let loaded = null;

// The download is several files; the progress is their bytes together
function trackProgress() {
  const files = new Map();
  return (event) => {
    if (event.status !== 'progress' || !event.total) return;
    files.set(event.file, { loaded: event.loaded, total: event.total });
    let done = 0;
    let total = 0;
    files.forEach((f) => {
      done += f.loaded;
      total += f.total;
    });
    self.postMessage({ type: 'progress', percent: Math.round((done / total) * 100) });
  };
}

function transcriber(name) {
  if (loaded && loaded.name === name) return loaded.pipe;
  const pipe = pipeline('automatic-speech-recognition', MODELS[name] || MODELS.accurate, {
    dtype: 'q8',
    device: 'wasm',
    progress_callback: trackProgress(),
  });
  loaded = { name, pipe };
  // A failed download is tried again next time
  pipe.catch(() => {
    if (loaded && loaded.pipe === pipe) loaded = null;
  });
  return pipe;
}

self.onmessage = async ({ data }) => {
  if (data.type === 'load') {
    // Errors show when the text is asked for
    transcriber(data.model).catch(() => {});
    return;
  }
  if (data.type !== 'transcribe') return;
  try {
    const pipe = await transcriber(data.model);
    const output = await pipe(data.audio, {
      language: data.language,
      task: 'transcribe',
      chunk_length_s: 30,
      stride_length_s: 5,
    });
    self.postMessage({ type: 'result', text: (output.text || '').trim() });
  } catch (err) {
    self.postMessage({ type: 'error', message: String((err && err.message) || err) });
  }
};
