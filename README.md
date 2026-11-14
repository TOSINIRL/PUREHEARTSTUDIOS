# Pure Hearted Studioz — GitHub and Netlify

This download contains the updated website: its images, styles, animations,
accessible booking dialog, and custom animated service picker.

## Quick upload to Netlify

1. Extract the ZIP.
2. Find the `netlify-site` folder inside `pureheartedstudio`.
3. Upload **that folder** to Netlify's manual drag-and-drop deploy area.
   Its `index.html` must be directly inside the folder you upload.

No Node server or build step is needed for this manual upload.

## GitHub with automatic Netlify updates

1. Create or open your GitHub repository.
2. Upload the **contents** of `pureheartedstudio` to the repository root,
   including `index.html`, `assets`, `css`, `js`, `scripts`, `package.json`,
   `package-lock.json`, and `netlify.toml`.
3. Import that repository into Netlify.
4. Use these build settings (also supplied in `netlify.toml`):
   - Base directory: repository root (leave blank)
   - Build command: `npm run build:site`
   - Publish directory: `netlify-site`
5. Publish using Netlify.

The generated `netlify-site` folder is included in the download for manual
upload, but is ignored by Git. Netlify recreates it on each GitHub-based build.
Edit the original files at the repository root, not the generated copies.

## Local preview

With Node.js installed, run `node server.mjs`, then open
`http://localhost:5000`. The live website itself remains plain HTML/CSS/JS;
it does not require a running Node server on Netlify.

## Rebuild the upload folder

Run `npm run build:site` after editing the source. This replaces the generated
`netlify-site` folder with a fresh copy containing only public website files.

## Tests

Run `npm ci` to install the test tools. See `tests/README.md` for browser test
setup, then use `npm run test:smoke`.

## Important before accepting real bookings

- EmailJS is **not configured**: its public key, service ID, and template ID
  are still placeholders. Uploading the site does not enable email delivery.
- The calendar is still hardcoded to **December 2025**. It does not represent
  current or live appointment availability.
- Booking confirmation and reminder wording is existing website content, not
  proof that those services are connected.
- Never commit private keys or credentials to GitHub or place them in browser
  JavaScript. No workspace secrets are included in this download.

## Included and excluded

Source, public images, static export, test files, and run/build configuration
are included. Installed dependencies, Git history, workspace internals,
uploaded reference screenshots, and generated test reports are excluded.
