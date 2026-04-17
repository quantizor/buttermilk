// Adapter for wouter.
//
// wouter has no headless "resolve against a route table" API. `<Switch>`
// iterates its Route children and, for each, runs `matchRoute(parser, pattern,
// path)`. We reproduce that algorithm here with the default parser
// (regexparam), pre-parsed at build time so pattern compilation does not
// re-happen on every match — the same amortization React consumers get after
// first render.

import { matchRoute } from 'wouter';
import { parse as parsePattern } from 'regexparam';
import type { RouteShape } from '../fixtures.ts';

type Pre = { pattern: RegExp; keys: string[] | false };

function toWouterPath(r: RouteShape): string {
  if (r.kind === 'catchall') return '/*';
  // wouter/regexparam uses the same `:name` syntax we emit, so pass through.
  return r.path;
}

export function build(routes: RouteShape[]) {
  const parsed: Pre[] = routes.map((r) =>
    parsePattern(toWouterPath(r)) as Pre,
  );
  return parsed;
}

export function run(parsed: Pre[], url: string): unknown {
  for (let i = 0; i < parsed.length; i++) {
    const p = parsed[i]!;
    const hit = matchRoute(() => p, p.pattern, url);
    if (hit[0]) return hit;
  }
  return null;
}

export const label = 'wouter';
