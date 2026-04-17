// Adapter for buttermilk v3 naive matcher (Phase 3: correctness-first
// tree-walking interpreter, no compilation).

import { findRoute, p, type Route } from 'buttermilk';
import type { RouteShape } from '../fixtures.ts';

type V3Route = Route<unknown>;

export function build(routes: RouteShape[]): V3Route[] {
  const render = () => null;
  return routes.map<V3Route>((r) => ({
    match: r.kind === 'catchall' ? p('/**') : p(r.path),
    render,
  }));
}

export function run(compiled: V3Route[], url: string): unknown {
  return findRoute(compiled, { url: `http://bench.local${url}` });
}

export const label = 'buttermilk-v3-naive';
