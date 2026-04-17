// Adapter for @tanstack/router-core.
//
// TanStack's matcher isn't exposed as a pure function — it lives on a
// `RouterCore` instance, which needs a route tree, a history, and a store
// config. We build a minimal non-reactive router per scenario, then call
// `getMatchedRoutes(pathname)` on the hot path (that's the call `RouterCore`
// itself uses during navigation).

import {
  BaseRoute,
  BaseRootRoute,
  RouterCore,
  createNonReactiveMutableStore,
  createNonReactiveReadonlyStore,
} from '@tanstack/router-core';
import { createMemoryHistory } from '@tanstack/history';
import type { RouteShape } from '../fixtures.ts';

type AnyRoute = BaseRoute<any, any, any, any>;
type Router = RouterCore<any, any, any, any>;

/** Convert `/users/:id` → `/users/$id` (TanStack syntax). */
function toTanStack(path: string): string {
  return path.replace(/:([a-zA-Z0-9_]+)/g, '$$$1');
}

export function build(routes: RouteShape[]): Router {
  const rootRoute = new BaseRootRoute({});
  const children: AnyRoute[] = [];
  for (const r of routes) {
    if (r.kind === 'catchall') {
      children.push(new BaseRoute({ getParentRoute: () => rootRoute, path: '$' }));
    } else {
      children.push(
        new BaseRoute({
          getParentRoute: () => rootRoute,
          path: toTanStack(r.path),
        }),
      );
    }
  }
  rootRoute.addChildren(children);

  return new RouterCore(
    {
      routeTree: rootRoute,
      history: createMemoryHistory({ initialEntries: ['/'] }),
    } as any,
    () => ({
      batch: (fn: () => void) => fn(),
      init: () => {},
      createMutableStore: createNonReactiveMutableStore,
      createReadonlyStore: createNonReactiveReadonlyStore,
    }) as any,
  );
}

export function run(router: Router, url: string): unknown {
  return (router as any).getMatchedRoutes(url);
}

export const label = 'tanstack';
