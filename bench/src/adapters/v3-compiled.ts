// Adapter for buttermilk v3 compiled matcher (Phase 4: radix-tree).

import { compile, p, type Route, type CompiledRouter } from 'buttermilk';
import type { RouteShape } from '../fixtures.ts';

export function build(routes: RouteShape[]): CompiledRouter {
  const render = () => null;
  const mapped: Route<unknown>[] = routes.map<Route<unknown>>((r) => ({
    match: r.kind === 'catchall' ? p('/**') : p(r.path),
    render,
  }));
  return compile(mapped);
}

export function run(router: CompiledRouter, url: string): unknown {
  return router.find({ url: `http://bench.local${url}` });
}

export const label = 'buttermilk-v3-compiled';
