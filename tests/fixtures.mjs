import { test as base, expect } from '@playwright/test';

export const test = base.extend({
  expectedEmailCalls: [0, { option: true }],
  emailStub: async ({}, use) => {
    const calls = [];
    const pending = [];
    await use({
      calls,
      record(args) {
        calls.push(args);
        return new Promise(resolve => pending.push(resolve));
      },
      succeed() {
        expect(pending, 'A stubbed booking must be pending').toHaveLength(1);
        pending.shift()({ status: 200, text: 'Stubbed success; no email sent' });
      },
    });
  },
  // Auto fixture installs safety guards before any page loads, including popups.
  safety: [async ({ context, baseURL, emailStub, expectedEmailCalls }, use) => {
    const errors = [];
    const blockedRequests = [];
    const emailCalls = [];
    context.on('page', page => {
      page.on('pageerror', error => errors.push(error.message));
    });
    await context.exposeBinding('__recordSmokeEmail', (_, args) => {
      emailCalls.push(args);
      if (expectedEmailCalls > 0) return emailStub.record(args);
      throw new Error('Email delivery is disabled in smoke tests');
    });
    await context.route('**/*', async route => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.href === 'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js') {
        await route.fulfill({
          contentType: 'text/javascript',
          body: `window.emailjs = {
            init() {},
            async send(...args) {
              return window.__recordSmokeEmail(args);
            }
          };`,
        });
      } else if (url.hostname === 'fonts.googleapis.com') {
        // Stable offline fallback fonts; never depend on a third-party CDN.
        await route.fulfill({ contentType: 'text/css', body: '' });
      } else if (url.origin === new URL(baseURL).origin &&
          ['GET', 'HEAD'].includes(request.method()) &&
          (['/', '/index.html'].includes(url.pathname) || /^\/(css|js|assets)\//.test(url.pathname))) {
        await route.continue();
      } else {
        blockedRequests.push(`${request.method()} ${url.origin}${url.pathname}`);
        await route.abort('blockedbyclient');
      }
    });
    await use();
    expect(emailCalls, 'Only explicitly expected, stubbed bookings may be submitted')
      .toHaveLength(expectedEmailCalls);
    expect(blockedRequests, 'Unexpected network request (blocked for safety)').toEqual([]);
    expect(errors, 'Uncaught browser JavaScript errors').toEqual([]);
  }, { auto: true }],
});

export { expect };
