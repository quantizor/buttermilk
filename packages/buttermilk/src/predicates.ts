import type {
  AndPredicate,
  ExtractParams,
  GuardPredicate,
  OpaquePredicate,
  OrPredicate,
  PathPredicate,
  Predicate,
  QueryPredicate,
  RegexPredicate,
  RouteRequest,
} from './types.ts';

/**
 * Match a path pattern string. Params are inferred from literal `:name`
 * segments. Patterns are validated eagerly — invalid shapes throw at
 * call time with a message naming the rule and the offending input.
 *
 * Supported syntax:
 *   - `:name`  — captures one non-empty segment as `params[name]`
 *   - `*`      — matches one non-empty segment, no capture
 *   - `**`     — matches the remaining segments; must be the final segment
 *
 * @example
 *   path('/users/:id')                  // Predicate<{ id: string }>
 *   path('/orgs/:org/repos/:repo')
 *   path('/docs/**')                    // catch-all
 */
export function path<const S extends string>(pattern: S): PathPredicate<ExtractParams<S>> {
  validatePattern(pattern);
  return { tag: 'path', pattern };
}

/**
 * Short alias for {@link path}. Kept for terse hand-typing; prefer `path`
 * in examples and generated code.
 */
export const p = path;

/**
 * Match an arbitrary RegExp against the URL pathname. Named capture groups
 * become params. Types can't be inferred from a runtime `RegExp`, so pass
 * the params shape via the generic.
 *
 * @example
 *   regex<{ slug: string }>(/^\/posts\/(?<slug>[a-z-]+)$/)
 */
export function regex<P extends Record<string, string> = Record<never, never>>(
  re: RegExp,
): RegexPredicate<P> {
  return { tag: 'regex', re };
}

/**
 * Match when the query string contains the given key. The matched value is
 * captured into `params[key]`. Compose with a path via {@link and}.
 *
 * @example
 *   query('q')                          // Predicate<{ q: string }>
 *   and(path('/search'), query('q'))
 */
export function query<const K extends string>(
  key: K,
): QueryPredicate<{ readonly [P in K]: string }> {
  return { tag: 'query', key };
}

/**
 * Match when `fn(req)` returns true. Contributes no params — use this for
 * auth gates, feature flags, or any yes/no check that doesn't carry data.
 * For a predicate that returns typed data, see {@link predicate}.
 *
 * @example
 *   guard((req) => req.headers?.cookie?.includes('sid='))
 */
export function guard(fn: (req: RouteRequest) => boolean): GuardPredicate<Record<never, never>> {
  return { tag: 'guard', fn };
}

/**
 * Escape hatch: a predicate that returns `Params | null` directly, carrying
 * typed data on a match. Opaque to the radix compiler — these run as linear
 * constraints, so prefer {@link path} / {@link regex} / {@link query} when
 * your check fits one of them.
 *
 * @example
 *   predicate<{ invoice: string }>((req) => {
 *     const m = req.url.match(/\/invoices\/(INV-\d+)/);
 *     return m?.[1] ? { invoice: m[1] } : null;
 *   })
 */
export function predicate<P>(fn: (req: RouteRequest) => P | null): OpaquePredicate<P> {
  return { tag: 'opaque', fn };
}

/**
 * Legacy name for {@link predicate}. Kept for back-compat; new code should
 * prefer `predicate`.
 */
export const custom = predicate;

/**
 * Intersection: both predicates must match. Param types merge via `&`.
 *
 * @example
 *   and(path('/search'), query('q'))
 */
export function and<A, B>(a: Predicate<A>, b: Predicate<B>): AndPredicate<A & B> {
  return { tag: 'and', left: a as Predicate<unknown>, right: b as Predicate<unknown> };
}

/**
 * Union: either predicate matches. Param types widen via `|` — the caller
 * has to narrow before reading a specific field.
 *
 * @example
 *   or(path('/user/:id'), path('/u/:id'))
 */
export function or<A, B>(a: Predicate<A>, b: Predicate<B>): OrPredicate<A | B> {
  return { tag: 'or', left: a as Predicate<unknown>, right: b as Predicate<unknown> };
}

function validatePattern(pattern: string): void {
  const body = pattern.startsWith('/') ? pattern.slice(1) : pattern;
  if (body === '') return;
  const segs = body.split('/');
  const seen = new Set<string>();

  for (let i = 0; i < segs.length; i++) {
    const seg = segs[i]!;

    if (seg.includes('**') && seg !== '**') {
      throw new Error(
        `buttermilk: '**' must be a standalone segment. Got '${pattern}'. ` +
          `Split the wildcard onto its own segment, e.g. '/foo/**'.`,
      );
    }

    if (seg === '**' && i !== segs.length - 1) {
      throw new Error(
        `buttermilk: '**' must be the final segment. Got '${pattern}'. ` +
          `Move '**' to the end, or use '*' for a single segment.`,
      );
    }

    if (seg.charCodeAt(0) === 58 /* ':' */) {
      const name = seg.slice(1);
      if (name === '') {
        throw new Error(
          `buttermilk: empty param name in '${pattern}'. ` +
            `Write ':<name>', e.g. '/users/:id'.`,
        );
      }
      if (seen.has(name)) {
        throw new Error(
          `buttermilk: duplicate param name ':${name}' in '${pattern}'. ` +
            `Each ':name' must be unique within a pattern.`,
        );
      }
      seen.add(name);
    }
  }
}
