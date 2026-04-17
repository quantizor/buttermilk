// @vitest-environment node

// Verifies the browser-condition bundle truly elides the RSC code paths.
// Skips if `pnpm build` hasn't produced `dist/index.browser.mjs` yet; CI
// runs build before test so this acts as a regression gate.

import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const browserPath = fileURLToPath(new URL('../dist/index.browser.mjs', import.meta.url));
const isoPath = fileURLToPath(new URL('../dist/index.mjs', import.meta.url));
const haveBuild = existsSync(browserPath) && existsSync(isoPath);

describe.skipIf(!haveBuild)('browser-condition bundle', () => {
  const browser = haveBuild ? readFileSync(browserPath, 'utf8') : '';
  const iso = haveBuild ? readFileSync(isoPath, 'utf8') : '';

  it('elides ServerRouter / ServerLink and their teaching-error text', () => {
    for (const needle of [
      'ServerRouter',
      'ServerLink',
      'Server Components',
      'Client Component',
      'use client',
    ]) {
      expect(browser, `'${needle}' leaked into the browser bundle`).not.toContain(needle);
    }
  });

  it('elides the useRef RSC probe', () => {
    expect(browser).not.toContain('useRef');
  });

  it('keeps the interactive pieces', () => {
    expect(browser).toContain('addEventListener');
    expect(browser).toContain('pushState');
  });

  it('leaves the isomorphic bundle unchanged (still RSC-aware)', () => {
    expect(iso).toContain('ServerRouter');
    expect(iso).toContain('Server Components');
    expect(iso).toContain('useRef');
  });

  it('is meaningfully smaller than the isomorphic bundle', () => {
    expect(browser.length).toBeLessThan(iso.length * 0.8);
  });
});
