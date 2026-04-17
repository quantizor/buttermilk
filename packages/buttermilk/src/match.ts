// Naive, tree-walking predicate matcher. Phase 3 of the v3 plan.
//
// Correctness-first: walk the tagged union, evaluate each leaf directly,
// combine via and/or. The radix compiler (Phase 4) optimises the common case.

import type {
  Location,
  MatchResult,
  Predicate,
  Route,
  RouteRequest,
} from './types.ts';
import { parseUrl } from './url.ts';

const EMPTY_PARAMS: Readonly<Record<string, string>> = Object.freeze({});

/**
 * Evaluate a predicate against a parsed request. Returns the params object
 * on a match, or null on miss.
 */
export function matchPredicate<P>(
  pred: Predicate<P>,
  req: RouteRequest,
  loc: Location,
): P | null {
  switch (pred.tag) {
    case 'path':
      return matchPath(pred.pattern, loc.pathname) as P | null;

    case 'regex': {
      const m = pred.re.exec(loc.pathname);
      if (!m) return null;
      return (m.groups ? { ...m.groups } : EMPTY_PARAMS) as unknown as P;
    }

    case 'query':
      return loc.query[pred.key] !== undefined
        ? ({ [pred.key]: loc.query[pred.key] } as unknown as P)
        : null;

    case 'guard':
      return pred.fn(req) ? (EMPTY_PARAMS as unknown as P) : null;

    case 'opaque':
      return pred.fn(req);

    case 'and': {
      const a = matchPredicate(pred.left, req, loc);
      if (a === null) return null;
      const b = matchPredicate(pred.right, req, loc);
      if (b === null) return null;
      // Merge. Both are plain objects (or EMPTY_PARAMS), safe to spread.
      return { ...(a as object), ...(b as object) } as P;
    }

    case 'or': {
      const a = matchPredicate(pred.left, req, loc);
      if (a !== null) return a as P;
      return matchPredicate(pred.right, req, loc) as P | null;
    }
  }
}

/**
 * The path pattern matcher. Supports:
 *   - `/:name` — captures a single non-slash segment as `params[name]`
 *   - `/*`     — matches a single segment (no capture)
 *   - `/**`    — matches zero or more remaining segments (no capture)
 *
 * Deliberately *different* from v2 — the old `*` was loose and hard to
 * reason about. See MIGRATING.md.
 */
function matchPath(pattern: string, pathname: string): Record<string, string> | null {
  // Normalise leading slash so split() produces the same shape.
  const pat = pattern.startsWith('/') ? pattern.slice(1) : pattern;
  const path = pathname.startsWith('/') ? pathname.slice(1) : pathname;

  // Strip trailing slash for both, except for the root "/" case.
  const patSegs = pat === '' ? [] : pat.split('/');
  const pathSegs = path === '' ? [] : path.split('/');

  const params: Record<string, string> = {};

  let i = 0;
  let j = 0;

  while (i < patSegs.length) {
    const ps = patSegs[i]!;

    if (ps === '**') {
      // Consume all remaining path segments. Must be the last pattern seg.
      if (i !== patSegs.length - 1) return null;
      return params;
    }

    if (j >= pathSegs.length) {
      // Out of path segments. Only matches if pattern is also done.
      return null;
    }

    const xs = pathSegs[j]!;

    if (ps === '*') {
      // Any single non-empty segment, no capture.
      if (xs === '') return null;
    } else if (ps.charCodeAt(0) === 58 /* ':' */) {
      if (xs === '') return null;
      params[ps.slice(1)] = xs;
    } else if (ps !== xs) {
      return null;
    }

    i++;
    j++;
  }

  // All pattern consumed. Path must also be consumed.
  if (j !== pathSegs.length) return null;
  return params;
}

/** Match a single route. Returns the full MatchResult or null. */
export function matchRoute<P>(
  route: Route<P>,
  req: RouteRequest,
): MatchResult<P> | null {
  const loc = parseUrl(req.url);
  const params = matchPredicate(route.match, req, loc);
  if (params === null) return null;
  return { params, location: loc };
}

/**
 * Linear-scan matcher: first matching route wins. Follows redirects
 * by re-entering with the resolved URL. Throws on cycles beyond a depth
 * of 10 (practical upper bound; catches typos).
 */
export function findRoute(
  routes: ReadonlyArray<Route<unknown>>,
  req: RouteRequest,
  depth = 0,
): { route: Route<unknown>; result: MatchResult<unknown> } | null {
  if (depth > 10) {
    throw new Error(`buttermilk: redirect chain exceeded depth 10 (started at ${req.url})`);
  }

  const loc = parseUrl(req.url);
  for (const route of routes) {
    const params = matchPredicate(route.match, req, loc);
    if (params === null) continue;

    const result: MatchResult<unknown> = { params, location: loc };

    if (route.redirect !== undefined) {
      const target =
        typeof route.redirect === 'function' ? route.redirect(result) : route.redirect;
      return findRoute(routes, { ...req, url: resolveRedirect(target, req.url) }, depth + 1);
    }

    return { route, result };
  }
  return null;
}

function resolveRedirect(target: string, originalUrl: string): string {
  if (target.includes('://')) return target;
  // Preserve origin from original URL (if any).
  const proto = originalUrl.indexOf('://');
  if (proto === -1) return target;
  const pathStart = originalUrl.indexOf('/', proto + 3);
  const origin = pathStart === -1 ? originalUrl : originalUrl.slice(0, pathStart);
  return `${origin}${target.startsWith('/') ? '' : '/'}${target}`;
}
