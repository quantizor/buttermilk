// <Router> — isomorphic across the React 19 server/client split.
//
// One module, two implementations. At load time we detect whether React's
// `react-server` condition was resolved (stateful hooks and `createContext`
// are missing from that build) and pick the matching Router / Link / hook
// behavior. Under RSC we render the match synchronously from a required
// `url` prop; under the normal React runtime we subscribe to history via
// `useSyncExternalStore` and provide a Context for descendants.
//
// `useRef` is the shortest-named hook that's absent from the react-server
// condition, so it's the cheapest signal to probe. Pattern mirrors
// styled-components v6: treat absent hook exports as a signal, not an
// error.
//
// The `__BROWSER__` flag is a build-time define. In the browser entry it
// is replaced with the literal `true`, letting the minifier collapse
// `IS_RSC` to `false` and dead-code-eliminate the server branches and
// their teaching-error strings.

import * as React from 'react';
import type { ReactNode } from 'react';
import {
  compile,
  findRoute,
  type CompiledRouter,
  type MatchResult,
  type Route,
  type RouteRequest,
} from 'buttermilk';

declare const __BROWSER__: boolean;

const IS_RSC =
  typeof __BROWSER__ !== 'undefined' && __BROWSER__
    ? false
    : typeof (React as { useRef?: unknown }).useRef !== 'function';

export interface RouterContext {
  readonly url: string;
  readonly result: MatchResult<unknown> | null;
  readonly route: Route<unknown> | null;
  /** Navigate to a new URL; updates history in the browser, no-op elsewhere. */
  readonly navigate: (url: string) => void;
}

export interface RouterProps {
  readonly routes: ReadonlyArray<Route<unknown>>;
  /**
   * Controlled URL. Required under RSC (there is no `window.location`).
   * In the client runtime it overrides the subscribed URL — pass it on the
   * initial server render, then drop the prop on hydration so the client
   * takes over browser history.
   */
  readonly url?: string;
  /** Use the compiled radix router under the hood. Defaults to true. */
  readonly compiled?: boolean;
  readonly children?: ReactNode;
}

const Ctx = IS_RSC ? null : React.createContext<RouterContext | null>(null);

export function useRouter(): RouterContext {
  if (IS_RSC) {
    throw new Error(
      'buttermilk-react: useRouter() must be called from a Client Component. ' +
        "Add \"'use client'\" to the top of the file that calls this hook, " +
        'or use <Router url=""> without hooks in Server Components.',
    );
  }
  const ctx = React.useContext(Ctx!);
  if (!ctx) throw new Error('buttermilk-react: useRouter() called outside <Router>');
  return ctx;
}

function ServerRouter({ routes, url, compiled = true, children }: RouterProps): ReactNode {
  if (url == null) {
    throw new Error(
      'buttermilk-react: <Router url="…"> is required in Server Components. ' +
        'Pass the current URL from your framework (e.g. Next.js ' +
        '`(await headers()).get("x-url")`).',
    );
  }
  const req: RouteRequest = { url };
  const matched = compiled ? compile(routes).find(req) : findRoute(routes, req);
  return (
    <>
      {matched ? <MatchedView route={matched.route} result={matched.result} /> : null}
      {children}
    </>
  );
}

function ClientRouter({ routes, url, compiled = true, children }: RouterProps): ReactNode {
  const compiledRouter = React.useMemo<CompiledRouter | null>(
    () => (compiled ? compile(routes) : null),
    [routes, compiled],
  );

  const currentUrl = React.useSyncExternalStore(
    subscribe,
    () => url ?? (typeof window !== 'undefined' ? window.location.href : '/'),
    () => url ?? '/',
  );

  const matched = React.useMemo(() => {
    const req: RouteRequest = { url: currentUrl };
    if (compiledRouter) return compiledRouter.find(req);
    return findRoute(routes, req);
  }, [compiledRouter, routes, currentUrl]);

  const navigate = React.useCallback((next: string) => {
    if (typeof window === 'undefined') return;
    React.startTransition(() => {
      window.history.pushState({}, '', next);
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
  }, []);

  const ctx = React.useMemo<RouterContext>(
    () => ({
      url: currentUrl,
      result: matched?.result ?? null,
      route: matched?.route ?? null,
      navigate,
    }),
    [currentUrl, matched, navigate],
  );

  const Provider = Ctx!.Provider;
  return (
    <Provider value={ctx}>
      {matched ? <MatchedView route={matched.route} result={matched.result} /> : null}
      {children}
    </Provider>
  );
}

function MatchedView({
  route,
  result,
}: {
  route: Route<unknown>;
  result: MatchResult<unknown>;
}): ReactNode {
  return route.render(result) as ReactNode;
}

export const Router: (props: RouterProps) => ReactNode = IS_RSC ? ServerRouter : ClientRouter;

function subscribe(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('popstate', listener);
  return () => window.removeEventListener('popstate', listener);
}
