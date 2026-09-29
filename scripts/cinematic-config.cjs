const profiles = {
  vertical: {
    viewport: { width: 360, height: 640 },
    deviceScaleFactor: 3,
    video: { width: 1080, height: 1920 },
  },
  desktop: {
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    video: { width: 1920, height: 1080 },
  },
};

// Progress values are the existing STORY_END=6 timeline, not a capture-only pose system.
const moments = [
  { id: 'hero', label: 'Hero', from: 0, to: 0, peak: 0, durationMs: 2400 },
  { id: 'card-exit', label: 'Animacao inicial do cartao', from: 0, to: 1, peak: 0.65, durationMs: 4200 },
  { id: 'pix', label: 'Transferencia Pix', from: 1.36, to: 1.84, peak: 1.605, durationMs: 3500 },
  { id: 'cashback', label: 'Retorno do Cashback', from: 2.4, to: 2.92, peak: 2.665, durationMs: 3500 },
  { id: 'cards', label: 'Abertura da stack', from: 3.3, to: 4.03, peak: 3.85, durationMs: 3500 },
  { id: 'final', label: 'Composicao final', from: 5.12, to: 6, peak: 5.9, durationMs: 4100 },
];

module.exports = { profiles, moments };
