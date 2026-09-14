export interface ScenePose { x: number; y: number; z: number; rx: number; ry: number; rz: number; scale: number; cameraZ: number; phone: number; spread: number; light: number }
export interface Chapter { at: number; desktop: ScenePose; mobile: ScenePose }
export const STORY_END = 3;

// Each chapter owns an absolute pose, so reverse scrolling and deep links are deterministic.
export const chapters: Chapter[] = [
  { at: 0, desktop: { x: 0, y: -1.12, z: 0, rx: .17, ry: -.24, rz: -.16, scale: .78, cameraZ: 8.6, phone: 0, spread: 0, light: 1 }, mobile: { x: 0, y: -.52, z: 0, rx: .16, ry: -.23, rz: -.19, scale: .79, cameraZ: 8.6, phone: 0, spread: 0, light: 1 } },
  { at: .22, desktop: { x: 0, y: 0, z: .5, rx: .12, ry: -.38, rz: -.23, scale: 1.05, cameraZ: 8.3, phone: 0, spread: 0, light: 1.1 }, mobile: { x: 0, y: .1, z: .2, rx: .12, ry: -.38, rz: -.2, scale: .83, cameraZ: 8.5, phone: 0, spread: 0, light: 1.1 } },
  { at: .48, desktop: { x: -.1, y: .25, z: 1.55, rx: .08, ry: -1.24, rz: -.12, scale: 1.22, cameraZ: 7.6, phone: 0, spread: 0, light: 1.25 }, mobile: { x: 0, y: .15, z: .7, rx: .08, ry: -1.16, rz: -.12, scale: 1, cameraZ: 8, phone: 0, spread: 0, light: 1.25 } },
  { at: .77, desktop: { x: .35, y: -.95, z: .5, rx: .05, ry: -.36, rz: -.26, scale: .5, cameraZ: 8.6, phone: 1, spread: .4, light: 1.15 }, mobile: { x: -.63, y: -.8, z: .6, rx: .04, ry: -.3, rz: -.25, scale: .46, cameraZ: 8.6, phone: 1, spread: .3, light: 1.15 } },
  { at: 1, desktop: { x: .35, y: -1.2, z: 1, rx: .08, ry: -.28, rz: -.3, scale: .48, cameraZ: 8.6, phone: 1, spread: 1, light: 1.1 }, mobile: { x: -.61, y: -1.02, z: .8, rx: .08, ry: -.26, rz: -.3, scale: .47, cameraZ: 8.6, phone: 1, spread: .65, light: 1.1 } },
];

// Preserve the complete first-slice coordinate range (0..1), including its scroll distance.
const account = chapters[chapters.length - 1];
chapters.push(
  { at: 1.3, desktop: { ...account.desktop, spread: 0, x: .3, scale: .43 }, mobile: { ...account.mobile, spread: 0, scale: .4 } },
  { at: 1.85, desktop: { ...account.desktop, spread: 0, x: .3, scale: .43, cameraZ: 8.35 }, mobile: { ...account.mobile, spread: 0, scale: .4 } },
  { at: 2.22, desktop: { ...account.desktop, spread: 0, x: 2.65, y: -.95, z: 1.3, scale: .65, ry: .3, rz: -.12 }, mobile: { ...account.mobile, spread: 0, x: .45, scale: .51, ry: .3, rz: -.12 } },
  { at: 2.48, desktop: { ...account.desktop, spread: 0, x: .9, y: -.8, z: 1.5, scale: .72, ry: -.2, rz: -.15, light: 1.2 }, mobile: { ...account.mobile, spread: 0, x: -.3, scale: .54, rz: -.15 } },
  { at: 3, desktop: { ...account.desktop, spread: 0, x: .65, y: -.9, z: 1, scale: .65, ry: -.25, rz: -.2 }, mobile: { ...account.mobile, spread: 0, x: -.5, scale: .51, rz: -.2 } },
);

export function samplePose(progress: number, mobile: boolean): ScenePose {
  const p = Math.max(0, Math.min(STORY_END, progress));
  const end = chapters.findIndex((chapter) => chapter.at >= p);
  const b = chapters[Math.max(0, end)];
  const a = chapters[Math.max(0, end - 1)];
  const t = a === b ? 0 : (p - a.at) / (b.at - a.at);
  const eased = t * t * (3 - 2 * t);
  const from = mobile ? a.mobile : a.desktop;
  const to = mobile ? b.mobile : b.desktop;
  const result = {} as ScenePose;
  for (const key of Object.keys(from) as (keyof ScenePose)[]) result[key] = from[key] + (to[key] - from[key]) * eased;
  return result;
}
