// Micro-profile: break the static-hit @ 1000 routes path into pieces.
// We want to know where the ~110 ns is going, component by component.

import { compile } from 'buttermilk';
import { parseUrl } from '../../packages/buttermilk/src/url.ts';
import { makeScenarios } from './fixtures.ts';
import * as v3c from './adapters/v3-compiled.ts';
import { measure } from 'mitata';

const s = makeScenarios().find((x) => x.name === '1000-routes')!;
const router = v3c.build(s.routes);

// Use the cheapest URL the scenario exposes.
// Change the label to exercise different paths.
const pick = process.argv[2] || 'static-hit-middle';
const url = s.urls.find((u) => u.label === pick)!.url;
console.log('URL:', url);

async function bench(label: string, fn: () => unknown) {
  fn(); // warm
  const r = await measure(fn, {
    min_cpu_time: 500,
    warmup_samples: 32,
    min_samples: 64,
  });
  console.log(`${label.padEnd(32)} p50=${r.p50.toFixed(1).padStart(7)} ns  avg=${r.avg.toFixed(1)} ns`);
}

const EMPTY_REQ = { url };

await bench('full router.find(req)', () => router.find(EMPTY_REQ));
await bench('parseUrl(url)', () => parseUrl(url));

// Manual bits of parseUrl:
await bench('indexOf(://)', () => url.indexOf('://'));
{
  const p = url.indexOf('://');
  const ps = url.indexOf('/', p + 3);
  await bench('slice after origin', () => url.slice(ps));
}
{
  const rest = url.slice(url.indexOf('/', url.indexOf('://') + 3));
  await bench('indexOf(? and #)', () => {
    rest.indexOf('#');
    rest.indexOf('?');
  });
  await bench('pathname split(/)', () => rest.split('/'));
}

// Just the trie walk from a raw pathname array:
const pathSegs = url
  .slice(url.indexOf('/', url.indexOf('://') + 3))
  .slice(1)
  .split('/');
console.log('pathSegs =', pathSegs);
