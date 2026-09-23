export interface ScenePose { x: number; y: number; z: number; rx: number; ry: number; rz: number; scale: number; cameraZ: number; phone: number; spread: number; light: number }
export interface Chapter { at: number; desktop: ScenePose; mobile: ScenePose }
export const STORY_END = 6;

// Each chapter owns an absolute pose, so reverse scrolling and deep links are deterministic.
export const chapters: Chapter[] = [
  { at: 0, desktop: { x: 0, y: -1.12, z: 0, rx: .17, ry: -.24, rz: -.16, scale: .78, cameraZ: 8.6, phone: 0, spread: 0, light: 1 }, mobile: { x: 0, y: -.52, z: 0, rx: .16, ry: -.23, rz: -.19, scale: .79, cameraZ: 8.6, phone: 0, spread: 0, light: 1 } },
  { at: .17, desktop: { x: 1.75, y: -.56, z: .17, rx: .15, ry: -.24, rz: -.17, scale: .72, cameraZ: 8.57, phone: 0, spread: 0, light: 1.05 }, mobile: { x: -.06, y: -.6, z: .07, rx: .14, ry: -.23, rz: -.195, scale: .73, cameraZ: 8.6, phone: 0, spread: 0, light: 1.05 } },
  { at: .3, desktop: { x: 1.6, y: -.65, z: .3, rx: .13, ry: -.25, rz: -.18, scale: .68, cameraZ: 8.55, phone: 1, spread: .4, light: 1.15 }, mobile: { x: -.12, y: -.65, z: .12, rx: .12, ry: -.24, rz: -.2, scale: .68, cameraZ: 8.6, phone: 1, spread: .3, light: 1.15 } },
  { at: .65, desktop: { x: .9, y: -1.02, z: .65, rx: .1, ry: -.27, rz: -.23, scale: .56, cameraZ: 8.5, phone: 1, spread: .7, light: 1.125 }, mobile: { x: -.4, y: -.9, z: .4, rx: .1, ry: -.25, rz: -.23, scale: .54, cameraZ: 8.6, phone: 1, spread: .475, light: 1.125 } },
  { at: 1, desktop: { x: .35, y: -1.2, z: 1, rx: .08, ry: -.28, rz: -.3, scale: .48, cameraZ: 8.6, phone: 1, spread: 1, light: 1.1 }, mobile: { x: -.61, y: -1.02, z: .8, rx: .08, ry: -.26, rz: -.3, scale: .47, cameraZ: 8.6, phone: 1, spread: .65, light: 1.1 } },
];

// Preserve the complete first-slice coordinate range (0..1), including its scroll distance.
const account = chapters[chapters.length - 1];
chapters.push(
  { at: 1.3, desktop: { ...account.desktop, spread: 0, x: .3, scale: .43 }, mobile: { ...account.mobile, spread: 0, x: -.95, scale: .32 } },
  { at: 1.85, desktop: { ...account.desktop, spread: 0, x: .3, scale: .43, cameraZ: 8.35 }, mobile: { ...account.mobile, spread: 0, x: -.95, scale: .32 } },
  { at: 2.22, desktop: { ...account.desktop, spread: 0, x: 2.65, y: -.95, z: 1.3, scale: .65, ry: .3, rz: -.12 }, mobile: { ...account.mobile, spread: 0, x: .45, scale: .51, ry: .3, rz: -.12 } },
  { at: 2.48, desktop: { ...account.desktop, spread: 0, x: .9, y: -.8, z: 1.5, scale: .72, ry: -.2, rz: -.15, light: 1.2 }, mobile: { ...account.mobile, spread: 0, x: -.3, scale: .54, rz: -.15 } },
  { at: 3, desktop: { ...account.desktop, spread: 0, x: .65, y: -.9, z: 1, scale: .65, ry: -.25, rz: -.2 }, mobile: { ...account.mobile, spread: 0, x: -.5, scale: .51, rz: -.2 } },
);

const cashback = chapters[chapters.length - 1];
chapters.push(
  { at: 3.4, desktop: { ...cashback.desktop, x: 1.75, y: -.65, scale: .75, ry: -.4, rz: -.15 }, mobile: { ...cashback.mobile, x: -.2, scale: .6, ry: -.32, rz: -.12 } },
  { at: 3.85, desktop: { ...cashback.desktop, x: 1.75, y: -.65, scale: .75, ry: -.3, rz: -.12, cameraZ: 8.4, light: 1.2 }, mobile: { ...cashback.mobile, x: -.2, scale: .6, ry: -.27, rz: -.12 } },
  { at: 4.25, desktop: { ...cashback.desktop, x: 1.35, y: -.55, scale: .62, light: .95 }, mobile: { ...cashback.mobile, x: -.3, scale: .5, light: .95 } },
  { at: 4.65, desktop: { ...cashback.desktop, x: .8, y: -1.1, scale: .5, light: .85 }, mobile: { ...cashback.mobile, x: -.5, scale: .44, light: .85 } },
  { at: 5, desktop: { ...cashback.desktop, x: .8, y: -1.1, scale: .5, light: .9 }, mobile: { ...cashback.mobile, x: -.5, scale: .44, light: .9 } },
);

const security = chapters[chapters.length - 1];
const closing: Chapter = {
  at: 5.8,
  desktop: { ...security.desktop, x: 1.03, y: -.9, z: 1.05, rx: .04, ry: -.32, rz: -.11, scale: .51, cameraZ: 8.9, light: 1.15 },
  mobile: { ...security.mobile, x: -.5, z: .72, rx: .04, ry: -.28, rz: -.14, scale: .43, light: 1.15 },
};
chapters.push(closing, { ...closing, at: STORY_END });

const poseKeys = Object.keys(chapters[0].desktop) as (keyof ScenePose)[];

// One travelling card ends at Account. Later appearances belong to their chapter,
// with the inter-chapter repositioning concealed while the card is retracted.
const cardAppearances = [
  [-1, 0, 1, 1.25],
  [2.345, 2.45, 3, 3.2],
  [3.22, 3.4, 4, 4.22],
  [4.45, 4.65, 5.05, 5.25],
  [5.45, 5.75, STORY_END, STORY_END + 1],
];
const smoothProgress = (p: number, start: number, end: number) => {
  const t = Math.max(0, Math.min(1, (p - start) / (end - start)));
  return t * t * (3 - 2 * t);
};

export function sampleCardPresence(progress: number): number {
  let presence = 0;
  for (const [start, entered, exit, ended] of cardAppearances) {
    presence = Math.max(presence, smoothProgress(progress, start, entered) * (1 - smoothProgress(progress, exit, ended)));
  }
  return presence;
}

export function samplePose(progress: number, mobile: boolean, result = {} as ScenePose): ScenePose {
  const p = Math.max(0, Math.min(STORY_END, progress));
  let end = 0;
  while (end < chapters.length - 1 && chapters[end].at < p) end++;
  const b = chapters[Math.max(0, end)];
  const a = chapters[Math.max(0, end - 1)];
  const t = a === b ? 0 : (p - a.at) / (b.at - a.at);
  const eased = t * t * (3 - 2 * t);
  const from = mobile ? a.mobile : a.desktop;
  const to = mobile ? b.mobile : b.desktop;
  for (const key of poseKeys) result[key] = from[key] + (to[key] - from[key]) * eased;
  return result;
}
