# PureHeartedStudio

This imported site uses plain HTML, CSS, and browser JavaScript. Keep the
existing structure and stack.

## Running on Replit

Use the **Start application** workflow (or the Run button).
The command is `node server.mjs`, using the existing Node.js 20 runtime.
No dependency installation or build step is required.
The server listens on `0.0.0.0:5000` and serves only `index.html`, `css/`,
`js/`, and `assets/`. Refresh the preview after editing site files.

## Browser smoke tests

Run `npm ci` once, then `npm run test:smoke` (or `npm test`).
This development-only Playwright suite uses its own read-only server on port
4173, blocks real email delivery, and leaves the static site and preview workflow
unchanged. Replit's Chromium is detected automatically. See `tests/README.md`
for browser setup elsewhere, coverage, and failure reports.

## Existing booking limitations

The site can be previewed without credentials. Email delivery is not configured:
`index.html` contains `YOUR_PUBLIC_KEY`, and `js/main.js` contains
`YOUR_SERVICE_ID` and `YOUR_TEMPLATE_ID`. These must be connected to the owner's
EmailJS service and matching template before booking emails will work.
Never put private service credentials in browser code.

The booking calendar is hardcoded in `index.html`, including its dates and
availability; it is not connected to a scheduling service. Review and update it
before accepting real appointments. Fonts and the EmailJS browser library load
from external CDNs.
