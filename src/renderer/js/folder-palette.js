// Folder colors: one family of tones that go together. Every color has the same lightness and
// colorfulness in OKLCH (a color space where equal numbers look equally light and vivid), so
// they differ only in hue; the hues go around the wheel in even steps from the default accent's
// amber. A new folder takes the hue farthest from the colors the folders already have, so
// folders made one after another stay easy to tell apart.

const LIGHTNESS = 0.7;
const CHROMA = 0.14;
const STEPS = 16;
const START_HUE = 70; // the default accent (#f59e0b) in OKLCH

const toLinear = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const toGamma = (v) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);

// OKLCH to linear sRGB (Björn Ottosson's OKLab)
function oklchToLinear(l, c, hue) {
  const h = (hue * Math.PI) / 180;
  const a = c * Math.cos(h);
  const b = c * Math.sin(h);
  const l1 = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m1 = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s1 = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l1 - 3.3077115913 * m1 + 0.2309699292 * s1,
    -1.2684380046 * l1 + 2.6097574011 * m1 - 0.3413193965 * s1,
    -0.0041960863 * l1 - 0.7034186147 * m1 + 1.707614701 * s1,
  ];
}

// A hue at the palette's lightness, as vivid as the screen can show up to CHROMA
function toneHex(hue) {
  let c = CHROMA;
  let rgb = oklchToLinear(LIGHTNESS, c, hue);
  while (rgb.some((v) => v < 0 || v > 1) && c > 0) {
    c -= 0.005;
    rgb = oklchToLinear(LIGHTNESS, c, hue);
  }
  return (
    '#' +
    rgb
      .map((v) => Math.round(toGamma(Math.min(1, Math.max(0, v))) * 255))
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  );
}

// The hue of a #rrggbb color, or null for a gray one (or one that is not a color)
export function hueOf(hex) {
  const m = /^#([0-9a-f]{6})$/i.exec(String(hex || '').trim());
  if (!m) return null;
  const [r, g, b] = [0, 2, 4].map((i) => toLinear(parseInt(m[1].slice(i, i + 2), 16) / 255));
  const l = Math.cbrt(0.4122214708 * r + 0.5363083432 * g + 0.0514702862 * b);
  const mm = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const a = 1.9779984951 * l - 2.428592205 * mm + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * mm - 0.808675766 * s;
  if (Math.hypot(a, bb) < 0.03) return null;
  return ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360;
}

export const FOLDER_PALETTE = Array.from({ length: STEPS }, (_, i) =>
  toneHex(START_HUE + (360 / STEPS) * i)
);

const hueGap = (x, y) => {
  const d = Math.abs(x - y) % 360;
  return d > 180 ? 360 - d : d;
};

// The palette color for a new folder, given the colors the folders have now: the one whose hue is
// farthest from theirs (the first in the palette's order on a tie; the least used once all are)
export function nextFolderColor(usedColors = []) {
  const used = usedColors.map((c) => String(c || '').toUpperCase());
  const hues = used.map(hueOf).filter((h) => h !== null);
  let best = FOLDER_PALETTE[0];
  let bestScore = [-1, -Infinity];
  FOLDER_PALETTE.forEach((color) => {
    const hue = hueOf(color);
    const gap = hues.length ? Math.min(...hues.map((h) => hueGap(h, hue))) : 180;
    const uses = used.filter((c) => c === color).length;
    // Round the gap to the palette's step, so a slightly shifted hand-picked color does not
    // decide alone; then fewer uses first
    const score = [Math.round(gap / (360 / STEPS / 2)), -uses];
    if (score[0] > bestScore[0] || (score[0] === bestScore[0] && score[1] > bestScore[1])) {
      best = color;
      bestScore = score;
    }
  });
  return best;
}
