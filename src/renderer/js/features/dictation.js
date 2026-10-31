// Dictation: the microphone button in the editor's toolbar records what is said and writes it
// where the caret is. Whisper turns the speech into text on this computer, in a worker
// (js/workers/dictation-worker.js); its model is downloaded once, the first time, and starts
// loading as soon as recording starts so it is ready when the user stops.

import { i18n } from '../i18n.js';

// Whisper listens at 16 kHz
const SAMPLE_RATE = 16000;
// Shorter than this is a click, not speech
const MIN_SECONDS = 0.4;

export class DictationFeature {
  dictationWorker() {
    if (!this.dictationWorkerInstance) {
      const worker = new Worker(new URL('../workers/dictation-worker.js', import.meta.url), {
        type: 'module',
      });
      worker.onmessage = ({ data }) => this.onDictationMessage(data);
      worker.onerror = (e) => this.finishDictation({ error: e.message || 'worker' });
      this.dictationWorkerInstance = worker;
    }
    return this.dictationWorkerInstance;
  }

  dictationModel() {
    return this.settings.dictationModel === 'fast' ? 'fast' : 'accurate';
  }

  isDictating() {
    return !!this.dictation;
  }

  toggleDictation() {
    if (!this.dictation) this.startDictation();
    else if (this.dictation.phase === 'recording') this.stopDictation();
  }

  async startDictation() {
    if (this.dictation) return;
    this.captureEditorSelection();
    this.dictation = { phase: 'starting', noteId: this.currentNote?.id, percent: null };
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
    } catch {
      this.dictation = null;
      this.renderDictation();
      this.showNotification(i18n.t('dictation.noMic'), 'error');
      return;
    }
    // Leaving the editor while the microphone was being asked for
    if (!this.dictation) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }
    const chunks = [];
    const recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    recorder.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      if (!this.dictation || this.dictation.cancelled) return;
      this.transcribeRecording(new Blob(chunks, { type: recorder.mimeType }));
    };
    recorder.start();
    Object.assign(this.dictation, { phase: 'recording', recorder, started: Date.now() });
    // The model loads (or downloads, the first time) while the user speaks
    this.dictationWorker().postMessage({ type: 'load', model: this.dictationModel() });
    this.dictationTimer = setInterval(() => this.renderDictation(), 500);
    this.renderDictation();
  }

  // Stop recording and turn it into text; cancel drops it
  stopDictation(cancel = false) {
    const state = this.dictation;
    if (!state) return;
    clearInterval(this.dictationTimer);
    if (cancel) {
      state.cancelled = true;
      if (state.recorder && state.recorder.state !== 'inactive') state.recorder.stop();
      this.dictation = null;
      this.renderDictation();
      return;
    }
    if (state.phase === 'recording') {
      state.phase = 'working';
      state.recorder.stop();
      this.renderDictation();
    }
  }

  async transcribeRecording(blob) {
    try {
      const context = new AudioContext({ sampleRate: SAMPLE_RATE });
      const decoded = await context.decodeAudioData(await blob.arrayBuffer());
      context.close();
      if (decoded.duration < MIN_SECONDS) {
        this.finishDictation({ text: '' });
        return;
      }
      // One channel: the average of all of them
      const audio = new Float32Array(decoded.length);
      for (let c = 0; c < decoded.numberOfChannels; c++) {
        const channel = decoded.getChannelData(c);
        for (let i = 0; i < audio.length; i++) audio[i] += channel[i] / decoded.numberOfChannels;
      }
      this.dictationWorker().postMessage(
        {
          type: 'transcribe',
          audio,
          model: this.dictationModel(),
          language: i18n.getLanguage() === 'en' ? 'english' : 'turkish',
        },
        [audio.buffer]
      );
    } catch (err) {
      this.finishDictation({ error: String((err && err.message) || err) });
    }
  }

  onDictationMessage(data) {
    if (data.type === 'progress') {
      if (this.dictation) {
        this.dictation.percent = data.percent < 100 ? data.percent : null;
        this.renderDictation();
      }
    } else if (data.type === 'result') {
      this.finishDictation({ text: data.text });
    } else if (data.type === 'error') {
      // A load started while recording may fail on its own; only a running transcription reports
      if (this.dictation && this.dictation.phase === 'working')
        this.finishDictation({ error: data.message });
    }
  }

  finishDictation({ text, error }) {
    const state = this.dictation;
    clearInterval(this.dictationTimer);
    this.dictation = null;
    this.renderDictation();
    if (error) {
      console.warn('Dictation failed:', error);
      const offline = /fetch|network|Failed to/i.test(error);
      this.showNotification(
        i18n.t(offline ? 'dictation.downloadFailed' : 'dictation.failed'),
        'error'
      );
      return;
    }
    // Only into the note it was recorded for, while it is still being edited
    if (!text || !state || !this.isEditorOpen() || this.currentNote?.id !== state.noteId) return;
    this.insertDictatedText(text);
  }

  insertDictatedText(text) {
    if (this.isMarkdownEditing()) {
      const area = this.markdownEditor;
      const start = area.selectionStart;
      const before = area.value.slice(0, start);
      const spaced = (before && !/\s$/.test(before) ? ' ' : '') + text + ' ';
      area.setRangeText(spaced, start, area.selectionEnd, 'end');
      area.dispatchEvent(new Event('input', { bubbles: true }));
      area.focus();
      return;
    }
    // A space before the text when it follows a word on the same line (the caret may sit in a
    // text node or between elements, so the line's text up to the caret is read)
    this.restoreEditorSelection();
    const range = this.caretRange();
    let before = '';
    if (range) {
      const line = this.topBlockOf(range.startContainer) || this.richEditor;
      const upToCaret = document.createRange();
      upToCaret.setStart(line, 0);
      upToCaret.setEnd(range.startContainer, range.startOffset);
      before = upToCaret.toString();
    }
    this.insertTextAtCursor((before && !/\s$/.test(before) ? ' ' : '') + text + ' ');
  }

  // The button and the line next to it: recording (with its time), downloading the model,
  // turning the speech into text, or nothing
  renderDictation() {
    const btn = this.dictateBtn;
    const status = this.dictationStatus;
    if (!btn || !status) return;
    const state = this.dictation;
    const phase = state ? state.phase : 'idle';
    btn.classList.toggle('is-recording', phase === 'recording');
    btn.classList.toggle('is-working', phase === 'working' || phase === 'starting');
    btn.querySelector('i').className = `fas ${
      phase === 'recording' ? 'fa-stop' : phase === 'idle' ? 'fa-microphone' : 'fa-spinner fa-spin'
    }`;
    const label = i18n.t(phase === 'recording' ? 'dictation.stop' : 'dictation.start');
    btn.title = label;
    btn.setAttribute('aria-label', label);
    btn.disabled = phase === 'working' || phase === 'starting';

    let text = '';
    if (phase === 'recording') {
      const seconds = Math.floor((Date.now() - state.started) / 1000);
      text = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
    } else if (phase === 'working') {
      text = i18n.t('dictation.working');
    }
    if (state && state.percent !== null) {
      const download = i18n.t('dictation.downloading', { percent: state.percent });
      text = text ? `${text} · ${download}` : download;
    }
    status.textContent = text;
    status.hidden = !text;
  }

  setupDictation() {
    this.dictateBtn?.addEventListener('mousedown', (e) => {
      // The note keeps its caret, where the text will go
      this.captureEditorSelection();
      e.preventDefault();
    });
    this.dictateBtn?.addEventListener('click', () => this.toggleDictation());
    this.renderDictation();
  }
}
