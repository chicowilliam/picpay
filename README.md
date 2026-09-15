# PicPay / Unofficial Concept

Independent portfolio concept. No affiliation with PicPay. The only external actions link to the official PicPay website; there is no authentication, form, analytics, or financial data collection.

## Local development

```sh
npm install
npm run dev
npm run build
npm run preview
```

The complete concept covers hero, scroll-controlled card approach, digital account, demonstrative Pix and cashback, conceptual card finishes, security, and the final product composition with an official-site CTA. No account functionality is implemented.

## Architecture

- `src/App.tsx`: semantic content, official links, capability detection, reduced-motion handling, and the shared GSAP timeline.
- `src/story/chapters.ts`: absolute poses and deterministic interpolation for desktop and mobile. Camera, card, phone, layers, and lights share the same progress.
- `src/scene/Scene.tsx`: one persistent R3F Canvas, rounded solid card, phone, two floating UI surfaces, and baked studio environment.
- `src/scene/textures.ts`: local, deterministic CanvasTexture artwork. Phone information is demonstrative; the balance is masked.
- `src/scene/Transfer.tsx`: baked demonstrative screen states and scroll-driven transfer/return paths; both reuse the existing phone and shared progress.
- `src/styles.css`: layouts, typography, responsive breakpoints, HTML fallback, and accessible focus states.

## Rendering decisions

No external model, environment, or texture downloads. Fonts are served locally. Objects have real thickness and beveled edges. A once-rendered 128px environment provides broad studio reflections; no real-time shadows, expensive transmission, or post-processing are used. Two floating panels and the phone screen form the three UI depth levels.

The scene renders on demand, with frames requested while scrolling, moving the pointer, or running visible ambient movement. The pause button stops ambient movement, not the scroll narrative. Hidden tabs stop requesting frames. DPR is capped at 1.5 and can decrease to 1 after consistently slow sampled frames. This is a basic quality safeguard, not a hardware benchmark.

Reduced motion, unavailable WebGL2, context loss, and very short landscape viewports use a static HTML/CSS composition with the same content. Browser and GPU performance must be evaluated on actual mobile hardware before publishing.

## Narrative

Progress 0..1 retains the original first-slice poses and physical scroll distance. Pix occupies 1..2; cashback occupies 2..3. `STORY_END` and the responsive story heights extend the existing timeline without renormalizing the original poses. The account anchor still targets progress 1. All event states derive directly from progress for reverse scrolling.

Cards and security occupy progress 3..5. The closing composition extends the same timeline to 6, preserving the security pose at 5 and resting from 5.8 onward. It reuses the phone, card, and account screen. Protection layers contract before being culled. Static modes include the same final CTA and independent-portfolio disclaimer.

## Verification artifacts

Local Playwright captures and measurements are stored in `output/playwright/`. This directory is ignored by git. No deployment is performed by this project.

See `VALIDATION.md` for tested viewports, measured scene complexity, limitations, and reproduction commands.
