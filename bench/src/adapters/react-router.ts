// Adapter for react-router v7 (`matchRoutes`).
//
// `matchRoutes(routes, location)` is react-router's headless matcher: it walks
// a route config and returns the matched branch. This is what data routers
// call internally on navigation.

import { matchRoutes } from 'react-router';
import type { RouteShape } from '../fixtures.ts';

type RRRoute = { path: string };

function toRR(r: RouteShape): RRRoute {
  if (r.kind === 'catchall') return { path: '*' };
  return { path: r.path };
}

export function build(routes: RouteShape[]): RRRoute[] {
  return routes.map(toRR);
}

export function run(routes: RRRoute[], url: string): unknown {
  return matchRoutes(routes, url);
}

export const label = 'react-router';
