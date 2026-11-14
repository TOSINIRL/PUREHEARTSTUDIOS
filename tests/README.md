# Browser smoke tests

The site stays plain HTML/CSS/JavaScript: no build step or runtime packages were
added. Playwright is a development-only dependency.

## Run

With Node.js 20 or newer:

```sh
npm ci
# On a machine without Replit's Chromium:
npx playwright install chromium
npm run test:smoke
```

On Linux outside Replit, Playwright may also require system browser dependencies
(see Playwright's installation instructions). Replit's supplied Chromium is
detected automatically. To use another installed Chromium, set
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to its absolute executable path. Otherwise
the suite uses Playwright's matching downloaded Chromium.

`npm test` is an alias. To run one project or test:

```sh
npm run test:smoke -- --project=mobile
npm run test:smoke -- --grep "Reduced motion"
npm run test:booking
```

The command starts and stops a test-only, read-only server on **127.0.0.1:4173**.
It does not need or reuse the preview workflow on port 5000. If port 4173 is
occupied, the command fails rather than silently testing an unrelated server.
No credentials or email configuration are needed.

## Coverage

- Page and booking-dialog horizontal overflow at 320, 375, 390, 480, 768, 769,
  1024, and 1440 pixels, including scrolling through the main sections.
- Mobile menu toggle, expanded state, and link-driven close.
- Every service card's preselection of the matching booking option.
- Available date → correctly formatted booking date, unavailable dates,
  close/backdrop behavior, and scroll-lock restoration.
- Service-strip pause/resume controls, accessible state, actual animation
  progress, hover, and focus pause.
- Reduced-motion initial load: static decorative elements, visible content,
  no pending scroll reveals, instant navigation, no parallax, and usable booking.
- Live reduced-motion changes: parallax and service-strip animation stop.
- Unexpected JavaScript errors and unexpected network calls fail every test.

Phone (touch) and desktop projects run the interaction tests. Desktop-only
viewport-matrix and hover tests are intentionally skipped in the phone project;
the mobile-menu test is intentionally skipped on desktop.

## Booking keyboard regression tests

`npm run test:booking` runs `tests/booking-keyboard.spec.mjs` on both projects;
`npm test` and `npm run test:smoke` include it automatically. Coverage includes:

- Enter and Space date activation, initial focus, accessible dialog name and
  selected-date description.
- Full forward/backward Tab order and wrapping, including disabled submit while
  a stubbed booking is pending and focus on the dialog container.
- Escape, close-button keyboard activation, backdrop, and successful-booking
  dismissal, restoring focus to the exact date and restoring scroll state.
- Native inert background behavior, preservation of previously inert siblings,
  and rapid reopen before the old closing timer finishes.

The rapid-reopen test controls the browser clock to exercise the closing-timer
race deterministically; assertions use real keyboard events, not dispatched
synthetic key events. These tests are behavioral, not animation snapshots.

## Email and network safety

The browser never loads the real EmailJS SDK: the fixture supplies an inert
`init` and a recorded `send` that fails by default. A send attempt fails the test
unless it explicitly opts into an exact expected call count. The booking-success
test uses a manually resolved Promise to hold submission pending and then
simulate success; it never loads the SDK or sends a real message. A second
guard allows only same-origin static GET/HEAD requests and blocks all other
requests, including EmailJS API calls and form POSTs. Service workers are blocked.
Only the opted-in stubbed-delivery test activates Confirm Booking. Keep the
automatic safety fixture in place when adding tests.

Google Fonts CSS is replaced with empty CSS so the suite runs offline using
fallback fonts. These are behavioral/layout checks, not pixel-diff snapshots;
they do not verify remote fonts or real email delivery.

## Failure evidence

Screenshots and traces are kept on failure under
`generated-artifacts/test-results/`. The HTML report is under
`generated-artifacts/playwright-report/`:

```sh
npm run test:smoke:report
npx playwright show-trace generated-artifacts/test-results/<failed-test>/trace.zip
```

Generated evidence and installed dependencies are excluded from Git and
deployment. Do not commit reports, traces, or `node_modules`.
