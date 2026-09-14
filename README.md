# PicPay / Unofficial Concept

Independent portfolio concept. No affiliation with PicPay. The only external actions link to the official PicPay website; there is no authentication, form, analytics, or financial data collection.

## Local development

```sh
npm install
npm run dev
npm run build
npm run preview
```

This first slice contains the hero, a scroll-controlled card approach, and a digital account scene. Pix, cashback, card variants, security, and a final conversion section are intentionally not implemented.

## Architecture

- `src/App.tsx`: semantic content, official links, capability detection, reduced-motion handling, and the shared GSAP timeline.
- `src/story/chapters.ts`: absolute poses and deterministic interpolation for desktop and mobile. Camera, card, phone, layers, and lights share the same progress.
- `src/scene/Scene.tsx`: one persistent R3F Canvas, rounded solid card, phone, two floating UI surfaces, and baked studio environment.
- `src/scene/textures.ts`: local, deterministic CanvasTexture artwork. Phone information is demonstrative; the balance is masked.
- `src/styles.css`: layouts, typography, responsive breakpoints, HTML fallback, and accessible focus states.

## Rendering decisions

No external model, environment, or texture downloads. Fonts are served locally. Objects have real thickness and beveled edges. A once-rendered 128px environment provides broad studio reflections; no real-time shadows, expensive transmission, or post-processing are used. Two floating panels and the phone screen form the three UI depth levels.

The scene renders on demand, with frames requested while scrolling, moving the pointer, or running visible ambient movement. The pause button stops ambient movement, not the scroll narrative. Hidden tabs stop requesting frames. DPR is capped at 1.5 and can decrease to 1 after consistently slow sampled frames. This is a basic quality safeguard, not a hardware benchmark.

Reduced motion, unavailable WebGL2, context loss, and very short landscape viewports use a static HTML/CSS composition with the same content. Browser and GPU performance must be evaluated on actual mobile hardware before publishing.

## Future chapters

Add new absolute poses to `chapters.ts`, introduce each chapter's semantic content in `App.tsx`, and extend the existing timeline. Keep one Canvas and shared models. Each new chapter should have a readable rest position, reverse-scroll continuity, a mobile pose, and a static equivalent. Validate every added transition before extending the next chapter.

## Verification artifacts

Local Playwright captures and measurements are stored in `output/playwright/`. This directory is ignored by git. No deployment is performed by this project.

See `VALIDATION.md` for tested viewports, measured scene complexity, limitations, and reproduction commands.
