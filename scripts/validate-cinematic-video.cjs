const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(path.join(
  process.env.APPDATA,
  'npm',
  'node_modules',
  '@playwright',
  'cli',
  'node_modules',
  'playwright',
));

const ROOT = path.resolve(__dirname, '..');
const OUTPUT = path.join(ROOT, 'output', 'video');
const playerPath = path.join(OUTPUT, 'validation-player.html');

(async () => {
  const metadata = JSON.parse(fs.readFileSync(path.join(OUTPUT, 'capture-metadata.json'), 'utf8'));
  fs.writeFileSync(playerPath, `<!doctype html><style>html,body{margin:0;background:#111;width:100%;height:100%;overflow:hidden}video{width:100%;height:100%;object-fit:contain}</style><video muted playsinline></video><script>document.querySelector('video').src=new URLSearchParams(location.search).get('src')</script>`);
  const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--allow-file-access-from-files'] });
  const report = [];
  try {
    for (const result of metadata.results) {
      const context = await browser.newContext({ viewport: result.output });
      const page = await context.newPage();
      const validationDirectory = path.join(OUTPUT, 'validation', result.profile);
      fs.mkdirSync(validationDirectory, { recursive: true });
      for (const clip of result.clips) {
        const clipPath = path.join(ROOT, clip.path);
        const playerUrl = `${new URL(`file:///${playerPath.replaceAll('\\', '/')}`).href}?src=${encodeURIComponent(new URL(`file:///${clipPath.replaceAll('\\', '/')}`).href)}`;
        await page.goto(playerUrl);
        const details = await page.locator('video').evaluate(video => new Promise((resolve, reject) => {
          const done = () => resolve({ duration: video.duration, width: video.videoWidth, height: video.videoHeight });
          if (video.readyState >= 1) done();
          else {
            video.addEventListener('loadedmetadata', done, { once: true });
            video.addEventListener('error', () => reject(new Error(video.error?.message || 'video error')), { once: true });
          }
        }));
        const samples = [];
        for (const ratio of [.15, .5, .85]) {
          await page.locator('video').evaluate((video, time) => new Promise(resolve => {
            video.pause();
            video.currentTime = time;
            video.addEventListener('seeked', resolve, { once: true });
          }), details.duration * ratio);
          const samplePath = path.join(validationDirectory, `${clip.id}-${Math.round(ratio * 100)}.png`);
          await page.screenshot({ path: samplePath });
          samples.push(path.relative(ROOT, samplePath));
        }
        const playback = await page.locator('video').evaluate(video => new Promise((resolve, reject) => {
          video.currentTime = 0;
          video.playbackRate = 1;
          video.onended = () => {
            const quality = video.getVideoPlaybackQuality?.();
            resolve({
              totalVideoFrames: quality?.totalVideoFrames ?? null,
              droppedVideoFrames: quality?.droppedVideoFrames ?? null,
              corruptedVideoFrames: quality?.corruptedVideoFrames ?? null,
            });
          };
          video.onerror = () => reject(new Error(video.error?.message || 'video playback error'));
          video.play().catch(reject);
        }));
        report.push({ profile: result.profile, id: clip.id, ...details, samples, playback });
      }
      await context.close();
    }
  } finally {
    await browser.close();
  }
  fs.writeFileSync(path.join(OUTPUT, 'validation-report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
