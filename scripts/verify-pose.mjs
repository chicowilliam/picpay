import assert from 'node:assert/strict';
import { chapters, samplePose, STORY_END } from '../src/story/chapters.ts';

function reference(progress, mobile) {
  const p = Math.max(0, Math.min(STORY_END, progress));
  const end = chapters.findIndex(chapter => chapter.at >= p);
  const b = chapters[Math.max(0, end)], a = chapters[Math.max(0, end - 1)];
  const t = a === b ? 0 : (p - a.at) / (b.at - a.at), eased = t * t * (3 - 2 * t);
  const from = mobile ? a.mobile : a.desktop, to = mobile ? b.mobile : b.desktop;
  return Object.fromEntries(Object.keys(from).map(key => [key, from[key] + (to[key] - from[key]) * eased]));
}
const output = samplePose(0, false);
for (const mobile of [false, true]) for (let i = -100; i <= 6100; i++) {
  assert.equal(samplePose(i / 1000, mobile, output), output);
  assert.deepEqual(output, reference(i / 1000, mobile));
}
console.log('12,402 pose samples match the approved interpolation exactly; output identity is stable.');
