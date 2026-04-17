// buttermilk-react/server — RSC-safe match helpers.
//
// This file has **no 'use client' directive**. It's intended for Server
// Components and any other server-side render target (RSC, streaming SSR,
// edge runtimes). Do NOT import React hooks or DOM APIs here.
//
// React 19's `cache()` memoizes a call within a single render, giving us
// per-request deduplication without React Context (which is unavailable in
// Server Components). The caller still owns the URL — they get it from
// their framework's request primitives (Next.js `headers()`, Waku, etc.)
// and pass it in explicitly.

import { cache } from 'react';
import {
  compile,
  type CompiledRouter,
  type Location,
  type MatchResult,
  type Route,
} from 'buttermilk';
import { parseUrl } from 'buttermilk';

/**
 * Compile a set of routes once per render. `cache()` ensures that repeated
 * calls with the same `routes` reference within a single server render
 * return the same CompiledRouter instance.
 */
export const getCompiledRouter = cache(
  (routes: readonly Route<unknown>[]): CompiledRouter => compile(routes),
);

/**
 * Resolve the current match for `(routes, url)`, de-duplicated across the
 * render tree. Server Components deep in the tree can call this to learn
 * what's currently rendering without prop-drilling.
 *
 * @example
 *   // app/layout.tsx (Next.js App Router)
 *   import { headers } from 'next/headers';
 *   import { getRouteMatch } from 'buttermilk-react/server';
 *   import { routes } from '@/routes';
 *
 *   export default async function Layout({ children }) {
 *     const url = (await headers()).get('x-url') ?? '/';
 *     const match = getRouteMatch(routes, url);
 *     return <main data-route={match?.route.id ?? 'none'}>{children}</main>;
 *   }
 */
export const getRouteMatch = cache(
  (
    routes: readonly Route<unknown>[],
    url: string,
  ): { route: Route<unknown>; result: MatchResult<unknown> } | null => {
    return getCompiledRouter(routes).find({ url });
  },
);

/** The parsed `Location` for the current render. */
export const getLocation = cache((url: string): Location => parseUrl(url));

/** The current pathname — the most-asked question in server components. */
export function getPathname(url: string): string {
  return getLocation(url).pathname;
}

/** Current match params, narrowed to `P`. Null if no route matched. */
export function getParams<P = Record<string, string>>(
  routes: readonly Route<unknown>[],
  url: string,
): P | null {
  const m = getRouteMatch(routes, url);
  return (m?.result.params as P) ?? null;
}
