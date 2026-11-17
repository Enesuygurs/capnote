// New folders take colors from one family of tones: each a different color until all are used,
// the next one far in hue from the last
export async function run() {
  const a = window.app;
  const { FOLDER_PALETTE, hueOf } = await import('./js/folder-palette.js');
  const colors = [];
  for (let i = 0; i < 16; i++) {
    a.folderNameInput.value = 'Klasör ' + i;
    await a.createFolder();
    colors.push(a.folders[a.folders.length - 1].color);
  }
  const gap = (x, y) => {
    const d = Math.abs(hueOf(x) - hueOf(y)) % 360;
    return d > 180 ? 360 - d : d;
  };
  return {
    allFromPalette: colors.every((c) => FOLDER_PALETTE.includes(c)),
    allDifferent: new Set(colors).size,
    secondFarFromFirst: gap(colors[0], colors[1]) >= 150,
  };
}

export const expected = {
  allFromPalette: true,
  allDifferent: 16,
  secondFarFromFirst: true,
};
