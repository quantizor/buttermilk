// Adapter for find-my-way — a high-performance HTTP router used as the
// non-React upper-bound reference.

import Router from 'find-my-way';
import type { RouteShape } from '../fixtures.ts';

export function build(routes: RouteShape[]) {
  const router = Router({ ignoreTrailingSlash: true });
  const handler = () => {};
  for (const r of routes) {
    if (r.kind === 'catchall') {
      // fmw wildcard
      router.on('GET', '/*', handler);
    } else {
      router.on('GET', r.path.replace(/:([^/]+)/g, ':$1'), handler);
    }
  }
  return router;
}

export function run(router: ReturnType<typeof build>, url: string): unknown {
  return router.find('GET', url);
}

export const label = 'find-my-way';
