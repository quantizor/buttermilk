// Radix-tree compiler for buttermilk v3.
//
// Linear scanning N routes is O(N · pattern-cost) per navigation — the hot
// path shows up on profiles once N climbs into the hundreds. The compiler
// partitions each route into:
//
//   1. A *path* predicate (the one thing the trie can dispatch on).
//   2. Zero or more *constraint* predicates (query / regex / guard / opaque)
//      that run after the trie locates the candidate leaves.
//
// Top-level `and` is flattened into those two halves. Top-level `or` splits
// one Route into multiple compiled entries — one per branch.
//
// Semantics vs `findRoute`:
//   - Path-bearing routes are dispatched via the trie; ties within a trie
//     node resolve by declaration order.
//   - Routes with no path part (`custom()` / `guard()` / etc alone) live in a
//     fallback list. The trie is consulted first; fallbacks run on miss.
//   - For strict first-match-wins across opaque+path mixes, use `findRoute`.
//
// Perf notes (keep or improve the `bench/REPORT.md` numbers):
//   - No `parseUrl` before a hit — pathname boundaries are scanned inline.
//   - Trie walk is cursor-based over the URL string (no `.split('/')`).
//   - `Location` is a class with lazy query parsing; fields beyond pathname
//     are filled from the already-known URL boundaries.
//   - `paramVals` is a per-router shared array, re-used across calls
//     (single-threaded JS; redirect re-entry happens after the outer walk
//     returns).
//   - Constraint-free zero-param leaves hit a fast path that reuses a
//     frozen `EMPTY_PARAMS` object.

import { matchPredicate } from './match.ts';
import type {
  Location,
  MatchResult,
  Predicate,
  Route,
  RouteRequest,
} from './types.ts';

const EMPTY_PARAMS: Readonly<Record<string, string>> = Object.freeze({});
const EMPTY_QUERY: Readonly<Record<string, string>> = Object.freeze({});

/** A compiled router. `find()` follows redirects up to depth 10. */
export interface CompiledRouter {
  find(req: RouteRequest): {
    readonly route: Route<unknown>;
    readonly result: MatchResult<unknown>;
  } | null;
}

/**
 * Hot-path match record. Carries `route`, `params` and `location` as own
 * fields so constructing one is a single allocation. `.result` is a getter
 * that returns `this` — since `this` already has `params` and `location`,
 * it trivially satisfies `MatchResult`. Saves an allocation on every match.
 */
class CompiledMatch implements MatchResult<unknown> {
  constructor(
    readonly route: Route<unknown>,
    readonly params: Record<string, unknown>,
    readonly location: Location,
  ) {}
  get result(): MatchResult<unknown> {
    return this;
  }
}

type Segment =
  | { readonly kind: 'static'; readonly value: string }
  | { readonly kind: 'param'; readonly name: string }
  | { readonly kind: 'wild' }
  | { readonly kind: 'catchall' };

interface CompiledEntry {
  readonly route: Route<unknown>;
  readonly segments: readonly Segment[] | null; // null ⇒ fallback
  readonly constraints: readonly Predicate<unknown>[];
  readonly paramNames: readonly string[];
  readonly order: number;
}

class Node {
  readonly statics: Map<string, Node> = new Map();
  paramChild: Node | null = null;
  wildChild: Node | null = null;
  catchallLeaves: CompiledEntry[] | null = null;
  leaves: CompiledEntry[] | null = null;
}

/**
 * Location with lazy pathname / search / hash / query. Holds only the URL
 * plus pre-computed byte boundaries; slices happen on first read. This is
 * the hot-path allocation — every match() builds one, so keeping the
 * constructor to four field writes matters.
 *
 * Single class → monomorphic → V8-friendly.
 */
class CompiledLocation implements Location {
  #pathname: string | null = null;
  #search: string | null = null;
  #hash: string | null = null;
  #query: Readonly<Record<string, string>> | null = null;
  constructor(
    readonly href: string,
    private readonly _pStart: number,
    private readonly _pEnd: number,
  ) {}
  get pathname(): string {
    if (this.#pathname !== null) return this.#pathname;
    const u = this.href;
    const s = this._pStart;
    const e = this._pEnd;
    const p = s === 0 && e === u.length ? u : u.slice(s, e);
    return (this.#pathname = p.length === 0 ? '/' : p);
  }
  get search(): string {
    if (this.#search !== null) return this.#search;
    const u = this.href;
    const pe = this._pEnd;
    if (pe >= u.length || u.charCodeAt(pe) !== 63 /* '?' */) return (this.#search = '');
    const h = u.indexOf('#', pe + 1);
    return (this.#search = h === -1 ? u.slice(pe) : u.slice(pe, h));
  }
  get hash(): string {
    if (this.#hash !== null) return this.#hash;
    const u = this.href;
    const pe = this._pEnd;
    if (pe >= u.length) return (this.#hash = '');
    if (u.charCodeAt(pe) === 35 /* '#' */) return (this.#hash = u.slice(pe));
    const h = u.indexOf('#', pe + 1);
    return (this.#hash = h === -1 ? '' : u.slice(h));
  }
  get query(): Readonly<Record<string, string>> {
    if (this.#query !== null) return this.#query;
    const s = this.search;
    return (this.#query = s.length < 2 ? EMPTY_QUERY : parseQuery(s));
  }
}

function parseQuery(search: string): Readonly<Record<string, string>> {
  const out: Record<string, string> = {};
  let i = 1;
  const len = search.length;
  while (i < len) {
    let amp = search.indexOf('&', i);
    if (amp === -1) amp = len;
    const eq = search.indexOf('=', i);
    if (eq === -1 || eq > amp) {
      out[decodeURIComponent(search.slice(i, amp))] = '';
    } else {
      out[decodeURIComponent(search.slice(i, eq))] = decodeURIComponent(
        search.slice(eq + 1, amp),
      );
    }
    i = amp + 1;
  }
  return out;
}

export function compile(routes: ReadonlyArray<Route<unknown>>): CompiledRouter {
  const root = new Node();
  const fallbacks: CompiledEntry[] = [];

  let order = 0;
  for (const route of routes) {
    for (const entry of partition(route, () => order++)) {
      if (entry.segments === null) fallbacks.push(entry);
      else insert(root, entry);
    }
  }
  sortLeaves(root);

  // Per-router scratch buffer for captured param values. JS is
  // single-threaded and redirect re-entry happens *after* the outer walk
  // has returned, so one slot is enough. Length is tracked explicitly and
  // reset on every find() so stale values from the previous call can't
  // leak into this one.
  const paramVals: string[] = [];

  return {
    find(req: RouteRequest) {
      paramVals.length = 0;
      return findWithRedirects(root, fallbacks, paramVals, req, 0);
    },
  };
}

function sortLeaves(node: Node) {
  const cmp = (a: CompiledEntry, b: CompiledEntry) => a.order - b.order;
  if (node.leaves) node.leaves.sort(cmp);
  if (node.catchallLeaves) node.catchallLeaves.sort(cmp);
  for (const child of node.statics.values()) sortLeaves(child);
  if (node.paramChild) sortLeaves(node.paramChild);
  if (node.wildChild) sortLeaves(node.wildChild);
}

// --- Lookup -------------------------------------------------------------

function findWithRedirects(
  root: Node,
  fallbacks: readonly CompiledEntry[],
  paramVals: string[],
  req: RouteRequest,
  depth: number,
): CompiledMatch | null {
  if (depth > 10) {
    throw new Error(`buttermilk: redirect chain exceeded depth 10 (started at ${req.url})`);
  }

  const url = req.url;

  // Pathname boundaries — inline so we can build Location from them later
  // without re-scanning.
  let pStart = 0;
  if (url.charCodeAt(0) !== 47 /* '/' */) {
    const proto = url.indexOf('://');
    if (proto !== -1) {
      const s = url.indexOf('/', proto + 3);
      pStart = s === -1 ? url.length : s;
    }
  }
  let pEnd = url.length;
  for (let i = pStart; i < pEnd; i++) {
    const c = url.charCodeAt(i);
    if (c === 63 /* '?' */ || c === 35 /* '#' */) { pEnd = i; break; }
  }

  const segStart =
    pStart < pEnd && url.charCodeAt(pStart) === 47 ? pStart + 1 : pStart;

  // Fast trie walk: returns the first leaf whose path structure matches.
  paramVals.length = 0;
  const entry = descend(root, url, segStart, pEnd, paramVals);

  if (entry === null) {
    // Trie missed — try fallbacks (opaque predicates). Only here do we need
    // a Location, because opaque predicates may read it.
    if (fallbacks.length === 0) return null;
    const loc = makeLocation(url, pStart, pEnd);
    for (let i = 0; i < fallbacks.length; i++) {
      const fb = fallbacks[i]!;
      if (fb.constraints.length === 0) continue;
      const c = runConstraints(fb.constraints, req, loc);
      if (c === null) continue;
      const match = new CompiledMatch(fb.route, c, loc);
      if (fb.route.redirect !== undefined) {
        return followRedirect(root, fallbacks, paramVals, match, req, depth);
      }
      return match;
    }
    return null;
  }

  // Constraint-free path — the common case. Build params from captured
  // values (if any), then the Location, then return. This is the static /
  // param / miss-fallback hot path.
  if (entry.constraints.length === 0) {
    const params =
      entry.paramNames.length === 0
        ? (EMPTY_PARAMS as Record<string, unknown>)
        : buildParams(entry.paramNames, paramVals);

    const match = new CompiledMatch(entry.route, params, makeLocation(url, pStart, pEnd));

    if (entry.route.redirect !== undefined) {
      return followRedirect(root, fallbacks, paramVals, match, req, depth);
    }
    return match;
  }

  // Constraint path — less common. Materialise Location, run constraints,
  // and if the primary leaf fails, re-walk the trie considering every
  // candidate leaf at each node (slow but rare).
  const loc = makeLocation(url, pStart, pEnd);
  const c = runConstraints(entry.constraints, req, loc);
  let chosen: CompiledEntry = entry;
  let params: Record<string, unknown>;
  if (c !== null) {
    const pathParams =
      entry.paramNames.length === 0
        ? (EMPTY_PARAMS as Record<string, unknown>)
        : buildParams(entry.paramNames, paramVals);
    params = merge(pathParams, c);
  } else {
    const slow = descendSlow(root, url, segStart, pEnd, req, loc);
    if (!slow) return null;
    chosen = slow.entry;
    params = slow.params;
  }

  const match = new CompiledMatch(chosen.route, params, loc);
  if (chosen.route.redirect !== undefined) {
    return followRedirect(root, fallbacks, paramVals, match, req, depth);
  }
  return match;
}

function followRedirect(
  root: Node,
  fallbacks: readonly CompiledEntry[],
  paramVals: string[],
  match: CompiledMatch,
  req: RouteRequest,
  depth: number,
): CompiledMatch | null {
  const redirect = match.route.redirect!;
  const target = typeof redirect === 'function' ? redirect(match) : redirect;
  const resolved = resolveRedirect(target, req.url);
  return findWithRedirects(root, fallbacks, paramVals, { ...req, url: resolved }, depth + 1);
}

function makeLocation(url: string, pStart: number, pEnd: number): Location {
  return new CompiledLocation(url, pStart, pEnd);
}

/**
 * Cursor-based trie walk. Returns the first leaf whose path structure
 * matches (constraints checked separately by the caller). Mutates
 * `paramVals` in place for each param segment captured; the caller is
 * responsible for reading the final length off the array.
 */
function descend(
  node: Node,
  url: string,
  pos: number,
  end: number,
  paramVals: string[],
): CompiledEntry | null {
  if (pos >= end) {
    const leaves = node.leaves;
    if (leaves !== null) return leaves[0]!;
    const ca = node.catchallLeaves;
    if (ca !== null) return ca[0]!;
    return null;
  }

  let segEnd = url.indexOf('/', pos);
  if (segEnd === -1 || segEnd >= end) segEnd = end;
  const segLen = segEnd - pos;
  const nextPos = segEnd + 1;

  if (node.statics.size !== 0) {
    const seg = url.slice(pos, segEnd);
    const staticChild = node.statics.get(seg);
    if (staticChild !== undefined) {
      const h = descend(staticChild, url, nextPos, end, paramVals);
      if (h !== null) return h;
    }
  }

  if (node.paramChild !== null && segLen !== 0) {
    paramVals.push(url.slice(pos, segEnd));
    const h = descend(node.paramChild, url, nextPos, end, paramVals);
    if (h !== null) return h;
    paramVals.pop();
  }

  if (node.wildChild !== null && segLen !== 0) {
    const h = descend(node.wildChild, url, nextPos, end, paramVals);
    if (h !== null) return h;
  }

  if (node.catchallLeaves !== null) return node.catchallLeaves[0]!;

  return null;
}

/**
 * Slow re-walk used only when the fast path hits a leaf whose constraints
 * rejected. Walks every candidate leaf at every reachable trie node in
 * declaration order. Rare on typical route tables.
 */
function descendSlow(
  root: Node,
  url: string,
  segStart: number,
  pEnd: number,
  req: RouteRequest,
  loc: Location,
): { entry: CompiledEntry; params: Record<string, unknown> } | null {
  const paramVals: string[] = [];
  return walkSlow(root, url, segStart, pEnd, paramVals, req, loc);
}

function walkSlow(
  node: Node,
  url: string,
  pos: number,
  end: number,
  paramVals: string[],
  req: RouteRequest,
  loc: Location,
): { entry: CompiledEntry; params: Record<string, unknown> } | null {
  if (pos >= end) {
    if (node.leaves) {
      const r = tryLeaves(node.leaves, paramVals, req, loc);
      if (r !== null) return r;
    }
    if (node.catchallLeaves) {
      const r = tryLeaves(node.catchallLeaves, paramVals, req, loc);
      if (r !== null) return r;
    }
    return null;
  }

  let segEnd = url.indexOf('/', pos);
  if (segEnd === -1 || segEnd >= end) segEnd = end;
  const segLen = segEnd - pos;
  const nextPos = segEnd + 1;

  if (node.statics.size !== 0) {
    const seg = url.slice(pos, segEnd);
    const sc = node.statics.get(seg);
    if (sc) {
      const r = walkSlow(sc, url, nextPos, end, paramVals, req, loc);
      if (r !== null) return r;
    }
  }

  if (node.paramChild !== null && segLen !== 0) {
    paramVals.push(url.slice(pos, segEnd));
    const r = walkSlow(node.paramChild, url, nextPos, end, paramVals, req, loc);
    if (r !== null) return r;
    paramVals.pop();
  }

  if (node.wildChild !== null && segLen !== 0) {
    const r = walkSlow(node.wildChild, url, nextPos, end, paramVals, req, loc);
    if (r !== null) return r;
  }

  if (node.catchallLeaves) {
    const r = tryLeaves(node.catchallLeaves, paramVals, req, loc);
    if (r !== null) return r;
  }

  return null;
}

function tryLeaves(
  leaves: readonly CompiledEntry[],
  paramVals: readonly string[],
  req: RouteRequest,
  loc: Location,
): { entry: CompiledEntry; params: Record<string, unknown> } | null {
  for (let i = 0; i < leaves.length; i++) {
    const leaf = leaves[i]!;
    const pathParams =
      leaf.paramNames.length === 0
        ? (EMPTY_PARAMS as Record<string, unknown>)
        : buildParams(leaf.paramNames, paramVals);
    if (leaf.constraints.length === 0) {
      return { entry: leaf, params: pathParams };
    }
    const c = runConstraints(leaf.constraints, req, loc);
    if (c === null) continue;
    return { entry: leaf, params: merge(pathParams, c) };
  }
  return null;
}

function buildParams(
  names: readonly string[],
  vals: readonly string[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (let i = 0; i < names.length; i++) out[names[i]!] = vals[i]!;
  return out;
}

function runConstraints(
  cs: readonly Predicate<unknown>[],
  req: RouteRequest,
  loc: Location,
): Record<string, unknown> | null {
  let merged: Record<string, unknown> | null = null;
  for (let i = 0; i < cs.length; i++) {
    const r = matchPredicate(cs[i]!, req, loc) as Record<string, unknown> | null;
    if (r === null) return null;
    if (isEmpty(r)) continue;
    if (merged === null) merged = { ...r };
    else Object.assign(merged, r);
  }
  return merged ?? (EMPTY_PARAMS as Record<string, unknown>);
}

function merge(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
): Record<string, unknown> {
  if (isEmpty(b)) return a;
  if (isEmpty(a)) return b;
  return { ...a, ...b };
}

function isEmpty(o: Record<string, unknown>): boolean {
  for (const _ in o) return false;
  return true;
}

// --- Insertion ----------------------------------------------------------

function insert(root: Node, entry: CompiledEntry): void {
  const segs = entry.segments!;
  let node = root;
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i]!;
    if (s.kind === 'catchall') {
      (node.catchallLeaves ??= []).push(entry);
      return;
    }
    node = childFor(node, s);
  }
  (node.leaves ??= []).push(entry);
}

function childFor(node: Node, s: Segment): Node {
  if (s.kind === 'static') {
    let c = node.statics.get(s.value);
    if (!c) {
      c = new Node();
      node.statics.set(s.value, c);
    }
    return c;
  }
  if (s.kind === 'param') {
    return (node.paramChild ??= new Node());
  }
  if (s.kind === 'wild') {
    return (node.wildChild ??= new Node());
  }
  throw new Error(`buttermilk: unexpected segment kind "${(s as { kind: string }).kind}"`);
}

// --- Partitioning -------------------------------------------------------

function partition(
  route: Route<unknown>,
  nextOrder: () => number,
): CompiledEntry[] {
  const branches = splitOr(route.match);
  return branches.map((branch) => toEntry(route, branch, nextOrder()));
}

function splitOr(pred: Predicate<unknown>): Predicate<unknown>[] {
  if (pred.tag !== 'or') return [pred];
  return [...splitOr(pred.left), ...splitOr(pred.right)];
}

type PathPredicate_ = { readonly tag: 'path'; readonly pattern: string };

function toEntry(
  route: Route<unknown>,
  pred: Predicate<unknown>,
  order: number,
): CompiledEntry {
  const bucket = { path: null as PathPredicate_ | null, constraints: [] as Predicate<unknown>[] };
  collect(pred, bucket);

  if (bucket.path === null) {
    return {
      route,
      segments: null,
      constraints: bucket.constraints,
      paramNames: [],
      order,
    };
  }

  const segments = parsePattern(bucket.path.pattern);
  const paramNames: string[] = [];
  for (const s of segments) if (s.kind === 'param') paramNames.push(s.name);

  return {
    route,
    segments,
    constraints: bucket.constraints,
    paramNames,
    order,
  };
}

function collect(
  pred: Predicate<unknown>,
  out: { path: PathPredicate_ | null; constraints: Predicate<unknown>[] },
): void {
  switch (pred.tag) {
    case 'and':
      collect(pred.left, out);
      collect(pred.right, out);
      return;
    case 'path':
      if (out.path === null) out.path = pred;
      else out.constraints.push(pred);
      return;
    case 'or':
      // Nested `or` — can't expand without rebuilding whole entries; treat as
      // opaque constraint (matchPredicate() handles it fine).
      out.constraints.push(pred);
      return;
    default:
      out.constraints.push(pred);
  }
}

function parsePattern(pattern: string): Segment[] {
  const raw = pattern.startsWith('/') ? pattern.slice(1) : pattern;
  if (raw === '') return [];
  const parts = raw.split('/');
  const out: Segment[] = [];
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i]!;
    if (p === '**') {
      if (i !== parts.length - 1) {
        throw new Error(`buttermilk: '**' must be the final path segment (got "${pattern}")`);
      }
      out.push({ kind: 'catchall' });
    } else if (p === '*') {
      out.push({ kind: 'wild' });
    } else if (p.charCodeAt(0) === 58 /* ':' */) {
      out.push({ kind: 'param', name: p.slice(1) });
    } else {
      out.push({ kind: 'static', value: p });
    }
  }
  return out;
}

// --- URL helpers --------------------------------------------------------

function resolveRedirect(target: string, originalUrl: string): string {
  if (target.includes('://')) return target;
  const proto = originalUrl.indexOf('://');
  if (proto === -1) return target;
  const pathStart = originalUrl.indexOf('/', proto + 3);
  const origin = pathStart === -1 ? originalUrl : originalUrl.slice(0, pathStart);
  return `${origin}${target.startsWith('/') ? '' : '/'}${target}`;
}
