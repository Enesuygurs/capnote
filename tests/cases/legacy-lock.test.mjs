// A note locked by an older version (plain password) is encrypted on first unlock

// The seed plays the older version: it leaves data in localStorage only
export const upgradeAfterSeed = true;

export async function seed() {
  localStorage.setItem(
    'capnote-notes',
    JSON.stringify([
      {
        id: 1,
        title: 'Legacy',
        content: '<p>legacy secret</p>',
        isLocked: true,
        password: 'old',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: [],
        isUnlocked: true,
      },
    ])
  );
  return 'seeded';
}

export async function run() {
  const a = window.app;
  const raw = JSON.stringify((await window.electronAPI.storage.load()).data.notes);
  const n = a.notes[0];
  setTimeout(() => {
    a.passwordInput.value = 'old';
    a.handlePasswordConfirm();
  }, 30);
  const ok = await a.unlockNoteForViewing(n);
  return {
    leaksPlain: raw.includes('legacy secret'),
    hasPassword: raw.includes('"password"'),
    hasUnlockFlag: raw.includes('isUnlocked'),
    lockedOnStart: n.isLocked,
    unlockWithOldPassword: ok,
    content: n.content,
  };
}

export const expected = {
  leaksPlain: false,
  hasPassword: false,
  hasUnlockFlag: false,
  lockedOnStart: true,
  unlockWithOldPassword: true,
  content: '<p>legacy secret</p>',
};
