// Dictation records from the microphone and writes the text where the caret is, with a space
// after a word; Escape drops a recording, and a text for a note that is no longer open is not
// written. Whisper is replaced by a stand-in here, so the test downloads no model.
export async function run() {
  const a = window.app;
  const wait = (ms) => new Promise((res) => setTimeout(res, ms));
  const r = {};
  // A microphone that plays a second of a tone
  navigator.mediaDevices.getUserMedia = async () => {
    const ctx = new AudioContext({ sampleRate: 16000 });
    const osc = ctx.createOscillator();
    const dest = ctx.createMediaStreamDestination();
    osc.connect(dest);
    osc.start();
    return dest.stream;
  };
  const sent = [];
  a.dictationWorkerInstance = {
    postMessage(message) {
      sent.push(message.type);
      if (message.type === 'transcribe') {
        r.language = message.language;
        r.samples = message.audio.length > 8000;
        setTimeout(() => a.onDictationMessage({ type: 'result', text: 'merhaba dünya' }), 50);
      }
    },
  };
  const until = async (check) => {
    for (let i = 0; i < 100 && !check(); i++) await wait(50);
  };

  a.createNewNote();
  a.richEditor.innerHTML = '<p>Not:</p>';
  a.placeCaretAtEnd(a.richEditor.firstChild);
  a.dictateBtn.click();
  await until(() => a.dictateBtn.classList.contains('is-recording'));
  r.recording = a.dictateBtn.classList.contains('is-recording');
  await wait(1000);
  a.dictateBtn.click();
  await until(() => !a.isDictating());
  r.sent = sent;
  r.html = a.richEditor.innerHTML;

  // Escape drops a recording; nothing is written
  sent.length = 0;
  a.dictateBtn.click();
  await until(() => a.dictateBtn.classList.contains('is-recording'));
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await wait(300);
  r.escaped = { dictating: a.isDictating(), editorOpen: a.isEditorOpen(), sent: [...sent] };

  // Another note opens while the text is being made: it is not written into either
  a.dictateBtn.click();
  await until(() => a.dictateBtn.classList.contains('is-recording'));
  await wait(800);
  a.dictateBtn.click();
  const before = a.richEditor.innerHTML;
  a.createNewNote();
  await wait(300);
  r.dropped = { dictating: a.isDictating(), newNote: a.richEditor.innerHTML };
  r.firstUnchanged = before === r.html;
  a.cancelEdit();
  return r;
}

export const expected = {
  recording: true,
  language: 'turkish',
  samples: true,
  sent: ['load', 'transcribe'],
  html: '<p>Not: merhaba dünya </p>',
  escaped: { dictating: false, editorOpen: true, sent: ['load'] },
  dropped: { dictating: false, newNote: '' },
  firstUnchanged: true,
};
