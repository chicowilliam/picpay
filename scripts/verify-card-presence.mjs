import assert from 'node:assert/strict';
import { sampleCardPresence, samplePose } from '../src/story/chapters.ts';

for (let i = 0; i <= 6000; i++) {
  const p = i / 1000, current = sampleCardPresence(p);
  assert.ok(current >= 0 && current <= 1);
  if (i) assert.ok(Math.abs(current - sampleCardPresence(p - .001)) < .015);
  if (p <= 1) assert.equal(current, 1);
}
for (const p of [1.25, 1.85, 2.22, 3.2, 4.25, 5.3]) assert.equal(sampleCardPresence(p), 0);
for (const p of [0, 1, 2.45, 3, 3.85, 5, 6]) assert.equal(sampleCardPresence(p), 1);
for (const mobile of [false, true]) for (let i = 0; i <= 1000; i++) {
  const pose = samplePose(i / 1000, mobile);
  assert.ok(Math.abs(pose.ry) <= .3, 'No large approach rotation');
  assert.ok(pose.cameraZ >= 8.5, 'No aggressive camera zoom');
}
console.log('Continuous card presence and restrained initial trajectory: passed.');
