// Adapter for buttermilk v2 (frozen snapshot in ../baseline/v2).

import { match } from '../../baseline/v2/utils.js';
import type { RouteShape } from '../fixtures.ts';

type V2Route = { path: string; render: () => unknown };

export function build(routes: RouteShape[]): V2Route[] {
  // v2 wants an array of { path, render }. Catchall is '*'.
  const render = () => null;
  return routes.map((r) => ({
    path: r.kind === 'catchall' ? '*' : r.path,
    render,
  }));
}

export function run(compiled: V2Route[], url: string): unknown {
  // v2's match() takes (routes, fullUrl). It synthesises a URL if given a path.
  // Give it a full URL to avoid any host-less quirks.
  return match(compiled, `http://bench.local${url}`);
}

export const label = 'buttermilk-v2';
