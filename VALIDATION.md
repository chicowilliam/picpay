# Verification - first slice

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
