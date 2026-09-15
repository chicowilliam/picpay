# Verification

## Closing composition - 2026-09-15

- Complete `verify-suite.cjs` run passed: legacy visual checks, final/polish, Pix/cashback, Cards/security, closing and fallback. All four requested portrait/desktop viewports and landscape were covered. No console errors or horizontal overflow were reported; regression thresholds passed after capture stabilization.
- Production preview smoke test passed at 390x844 using `verify-production.cjs`: final CTA, rendered scene, console and overflow. Capture: `production-mobile-cta.png`.
- `verify-closing.cjs` passed at 1440x900, 1920x1080, 390x844 and 360x640: final rest, forward/reverse poses, cursor response, keyboard focus, touch target, official link, persistent disclaimer, console and overflow.
- Security at progress 5 has zero changed pixels against pre-closing captures, excluding the bottom 80px containing the intentionally revised disclaimer and progress bar.
- Landscape 844x390, reduced motion and unavailable WebGL use the static closing composition and official CTA.
- Visual inspection covered desktop, both portrait sizes and the full static narrative. The final CTA is 48px high on mobile; existing geometry and textures are reused.
- Final renderer: 16 draw calls / 10,502 triangles at all four viewports; sampled DPR 1, unchanged cap 1.5. Protection geometry is culled after its contraction.
- `npm run build` completed successfully (TypeScript plus Vite 7.3.6). Vite transformed 1,906 modules in 8m 59s. The slow build continued consuming CPU and completed without build-configuration changes; no compiler error or reproducible deadlock was observed. Duplicate task-owned dev/preview servers were removed before this run.
- Production assets: main JS 329.14 kB (112.34 kB gzip), lazy scene 940.60 kB (259.36 kB gzip), CSS 15.64 kB (4.11 kB gzip). No new image/model assets or dependencies. The Three.js chunk remains the largest download; actual device FPS, Safari behavior and Core Web Vitals remain unmeasured.
- Regression capture stabilization now matches the pre-closing baseline's paused pointer sampling. Only the intentionally revised bottom disclaimer/progress strip is masked; product-area comparison thresholds remain unchanged.

Screenshots: `final-{1440,1920,390,360}-cta.png`, `complete-story-{1440,390}.png`, `complete-{width}-{chapter}.png`, and `closing-{landscape,reduced,webgl}.png` under `output/playwright/`.

## Second slice: Pix and cashback

Verified on 2026-09-14 using `scripts/verify-suite.cjs`, which runs the existing visual, final, polish and fallback checks plus `verify-extension.cjs`. Production build (`tsc -b && vite build`) passed.

- 1440x900, 390x844 and 360x640: forward/reverse chapter poses, transfer progress and confirmation states passed; no console errors, forms or horizontal overflow.
- 844x390 landscape, reduced motion and unavailable WebGL: static Pix and cashback sections present, no Canvas or horizontal overflow.
- Existing pointer, pause, account anchor and resize checks passed, including 1920x1080.
- Canvas-pixel checks confirmed visible products and horizontal safety margins in both new hero moments.
- Account comparison against pre-extension captures: zero changed pixels at 1440x900 and 360x640; one changed pixel at 390x844 (0.000305%). The bottom three pixels are excluded because the progress bar now represents the longer narrative. The original 0..1 poses and physical scroll distance remain unchanged.
- Final inspection adjustments: reused the actual phone-screen material to remove duplicate status bars, reduced/offset the supporting mobile Pix card to expose the destination, enlarged the mobile transfer amount, and corrected shared development diagnostics for reverse-state assertions.
- Active Pix/cashback captures: approximately 18 draw calls / 10,654 triangles. Settled states: 16 calls / 10,502 triangles. Original account: 20 calls / 13,154 triangles. Sampled DPR: 1, unchanged ceiling: 1.5.
- No live shadow maps, post-processing passes or particle system. Four baked screen textures add GPU memory; real-device Safari/Android frame pacing, thermal behavior and Core Web Vitals remain unmeasured.

Final captures: `output/playwright/slice2-1440-pix.png`, `slice2-1440-cashback.png`, `slice2-390-pix.png`, `slice2-390-cashback.png`, plus 360px, transition, confirmation and landscape captures in the same directory.

Run the complete suite in an existing Playwright CLI session:

```sh
playwright-cli -s=picpay run-code --filename=scripts/verify-suite.cjs
```

The suite loads the local verification scripts served by Vite and closes its isolated browser contexts. `scripts/baseline.cjs` records the original one-slice version and should not be rerun against the extended story to replace the pre-change baseline.

Verified with Playwright/Chromium on 2026-09-14. This is viewport emulation on the development machine, not a real-device iOS/Android performance certification.

## Passed

- Desktop 1440x900: five scroll positions, forward/reverse continuity, rendered Canvas pixels, and no horizontal overflow.
- Mobile 390x844: the same five positions; 24,445 green product pixels detected in the account Canvas capture.
- Additional visual inspection at 360x640 and 1920x1080.
- 844x390 landscape: static, naturally scrolling fallback.
- Pointer tilt: measured rotation change of approximately 0.030 radians.
- Ambient pause state and navigation from hero to account and back.
- Reduced motion and unavailable WebGL: no mounted Canvas, usable static compositions.
- Persistent unofficial-concept label remained entirely inside the tested viewports.
- No runtime/console errors in the visual and interaction runs.
- No forms or inputs; both external links point to the official PicPay website.

## Adjustments from visual inspection

- Reduced the desktop hero card to separate it from the account-opening CTA.
- Moved and reduced the supporting card in the account scene to reveal the application interface.
- Lowered direct light intensity and refined clearcoat for deeper green and more defined reflections.
- Raised the mobile activity panel to keep its text clear of the card.
- Adapted the initial card and phone to available viewport height.
- Moved the small-screen interface caption below the product and enlarged the unofficial label and pause touch target.

## Rendering measurements

Development renderer diagnostics reported 8 draw calls / 2,124 triangles in the hero and 20 draw calls / 13,154 triangles in the account scene. The sampled quality level used DPR 1; the configured ceiling is 1.5. No live shadow maps or post-processing passes are used.

These are scene-complexity measurements, not FPS or Core Web Vitals measurements. Thermal behavior, actual iPhone/Safari compatibility, low-end Android frame pacing, LCP, and INP remain real-device/pre-release checks.

## Reproduce

With the dev server running at http://127.0.0.1:5173/ and Playwright CLI installed:

```sh
playwright-cli -s=picpay open http://127.0.0.1:5173/
playwright-cli -s=picpay resize 1440 900
playwright-cli -s=picpay run-code --filename=scripts/verify-visual.cjs
playwright-cli -s=picpay resize 390 844
playwright-cli -s=picpay run-code --filename=scripts/verify-visual.cjs
playwright-cli -s=picpay run-code --filename=scripts/verify-polish.cjs
playwright-cli -s=picpay run-code --filename=scripts/verify-final.cjs
playwright-cli -s=picpay run-code --filename=scripts/verify-fallback.cjs
```

The files contain functions consumed by Playwright CLI, not standalone Node scripts. Run the fallback test last because it deliberately disables WebGL for subsequent navigations in that test context. The polish/final scripts create and close isolated browser contexts.

Final screenshots live in `output/playwright/final-1440-hero.png`, `final-1440-account.png`, `final-390-hero.png`, `final-390-account.png`, `final-360-hero.png`, and `final-360-account.png`.
