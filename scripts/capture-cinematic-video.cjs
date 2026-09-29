const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { chromium } = require(path.join(
  process.env.APPDATA,
  'npm',
  'node_modules',
  '@playwright',
  'cli',
  'node_modules',
  'playwright',
));
const { profiles, moments } = require('./cinematic-config.cjs');

const ROOT = path.resolve(__dirname, '..');
const OUTPUT = path.join(ROOT, 'output', 'video');
const URL = process.env.CAPTURE_URL || 'http://127.0.0.1:5174/';
const ffmpeg = path.join(process.env.LOCALAPPDATA, 'ms-playwright', 'ffmpeg-1011', 'ffmpeg-win64.exe');
const selected = process.argv.find(arg => arg.startsWith('--profile='))?.split('=')[1] || 'all';
const selectedProfiles = selected === 'all' ? Object.keys(profiles) : [selected];

const ensure = directory => fs.mkdirSync(directory, { recursive: true });
const seconds = milliseconds => Math.max(0, milliseconds / 1000);

function runFfmpeg(args) {
  const result = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', ...args], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  if (result.status !== 0) throw new Error(result.stderr || `ffmpeg failed (${result.status})`);
}

async function seek(page, progress, settleMs = 900) {
  await page.evaluate(value => {
    const end = Number(document.querySelector('.story')?.dataset.storyEnd || 6);
    const distance = document.documentElement.scrollHeight - innerHeight;
    scrollTo(0, distance * value / end);
  }, progress);
  await page.waitForTimeout(settleMs);
}

async function animate(page, from, to, durationMs) {
  if (from === to) {
    await page.waitForTimeout(durationMs);
    return;
  }
  await page.evaluate(({ from, to, durationMs }) => new Promise(resolve => {
    const end = Number(document.querySelector('.story')?.dataset.storyEnd || 6);
    const distance = document.documentElement.scrollHeight - innerHeight;
    const started = performance.now();
    const frame = now => {
      const t = Math.min(1, (now - started) / durationMs);
      const eased = t * t * (3 - 2 * t);
      scrollTo(0, distance * (from + (to - from) * eased) / end);
      if (t < 1) requestAnimationFrame(frame);
      else resolve();
    };
    requestAnimationFrame(frame);
  }), { from, to, durationMs });
}

async function captureProfile(browser, profileName) {
  const profile = profiles[profileName];
  if (!profile) throw new Error(`Unknown profile: ${profileName}`);

  const directories = {
    master: path.join(OUTPUT, 'masters'),
    clips: path.join(OUTPUT, 'clips', profileName),
    frames: path.join(OUTPUT, 'frames', profileName),
  };
  Object.values(directories).forEach(ensure);

  const context = await browser.newContext({
    viewport: profile.viewport,
    deviceScaleFactor: profile.deviceScaleFactor,
    // Record at the CSS viewport so Chromium does not place a mobile frame in
    // the corner of a larger video surface. Upscaling happens after capture.
    recordVideo: { dir: directories.master, size: profile.viewport },
  });
  const page = await context.newPage();
  const video = page.video();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  const recordedAt = Date.now();
  const ranges = [];

  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForSelector('.scene-ready', { timeout: 120000 });
  await page.waitForTimeout(4200);

  for (const moment of moments) {
    await seek(page, moment.peak, moment.id === 'hero' ? 1200 : 900);
    await page.screenshot({
      path: path.join(directories.frames, `${moment.id}.png`),
      animations: 'allow',
    });

    await seek(page, moment.from);
    const startMs = Date.now() - recordedAt;
    await page.waitForTimeout(450);
    await animate(page, moment.from, moment.to, Math.max(0, moment.durationMs - 900));
    await page.waitForTimeout(450);
    const endMs = Date.now() - recordedAt;
    ranges.push({ ...moment, startMs, endMs });
  }

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  await context.close();
  const rawPath = await video.path();
  const masterPath = path.join(directories.master, `${profileName}-capture-master.webm`);
  if (fs.existsSync(masterPath)) fs.unlinkSync(masterPath);
  fs.renameSync(rawPath, masterPath);

  const clips = [];
  for (const range of ranges) {
    const output = path.join(directories.clips, `${range.id}.webm`);
    runFfmpeg([
      '-i', masterPath,
      '-ss', seconds(range.startMs).toFixed(3),
      '-t', seconds(range.endMs - range.startMs).toFixed(3),
      '-an',
      '-vf', `scale=${profile.video.width}:${profile.video.height}`,
      '-c:v', 'libvpx',
      '-crf', '18',
      '-b:v', profileName === 'vertical' ? '8M' : '10M',
      '-deadline', 'good',
      '-cpu-used', '2',
      output,
    ]);
    clips.push({ id: range.id, path: path.relative(ROOT, output), durationMs: range.endMs - range.startMs });
  }

  return {
    profile: profileName,
    viewport: profile.viewport,
    deviceScaleFactor: profile.deviceScaleFactor,
    output: profile.video,
    master: path.relative(ROOT, masterPath),
    clips,
    errors,
    overflow,
  };
}

(async () => {
  if (!fs.existsSync(ffmpeg)) throw new Error(`Playwright ffmpeg not found: ${ffmpeg}`);
  ensure(OUTPUT);
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const results = [];
  try {
    for (const profile of selectedProfiles) results.push(await captureProfile(browser, profile));
  } finally {
    await browser.close();
  }
  fs.writeFileSync(path.join(OUTPUT, 'capture-metadata.json'), `${JSON.stringify({ url: URL, moments, results }, null, 2)}\n`);
  console.log(JSON.stringify(results, null, 2));
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
