// Public types for buttermilk v3.
//
// Design notes:
//   - A Predicate is a tagged union, never an opaque function. The compiler
//     in `compile.ts` reads the tag to pick a fast path per kind.
//   - The type parameter P is the *params object* the predicate produces when
//     it matches. An empty `{}` means "matches but adds no params".
//   - The runtime carries zero type information — `_params` is a phantom field
//     that exists only at the type level and is never read.

/**
 * What a predicate is fed when the router asks "does this match?".
 * Intentionally minimal and extensible via module augmentation.
 *
 * @example
 *   // Add your own fields at the type level:
 *   declare module 'buttermilk' {
 *     interface RouteRequest { cookies: Record<string, string> }
 *   }
 */
export interface RouteRequest {
  /** Full URL (e.g. "http://example.com/users/42?tab=profile"). */
  readonly url: string;
  /** HTTP method in server contexts. Optional in browser. */
  readonly method?: string;
  /** Raw header map in server contexts. Optional in browser. */
  readonly headers?: Readonly<Record<string, string>>;
}

/**
 * Pull `{ [paramName]: string }` out of a string pattern like `"/users/:id"`.
 *
 * Only extracts `:name` segments — wildcards (`*`/`**`) and optional segments
 * (`(/foo)`) are still supported at runtime via the `path` predicate, they
 * just don't produce typed params.
 */
export type ExtractParams<S extends string> =
  S extends `${string}:${infer Rest}`
    ? Rest extends `${infer Name}/${infer After}`
      ? { readonly [K in Name]: string } & ExtractParams<`/${After}`>
      : Rest extends `${infer Name}?${string}`
        ? { readonly [K in Name]: string }
        : { readonly [K in Rest]: string }
    : Record<never, never>;

/**
 * A tagged predicate. The runtime compiler uses the tag to dispatch without
 * polymorphic calls on the hot path.
 */
export type Predicate<P = Record<never, never>> =
  | PathPredicate<P>
  | RegexPredicate<P>
  | QueryPredicate<P>
  | GuardPredicate<P>
  | OpaquePredicate<P>
  | AndPredicate<P>
  | OrPredicate<P>;

export interface PathPredicate<P> {
  readonly tag: 'path';
  readonly pattern: string;
  readonly _params?: P;
}

export interface RegexPredicate<P> {
  readonly tag: 'regex';
  readonly re: RegExp;
  readonly _params?: P;
}

export interface QueryPredicate<P> {
  readonly tag: 'query';
  readonly key: string;
  readonly _params?: P;
}

export interface GuardPredicate<P> {
  readonly tag: 'guard';
  readonly fn: (req: RouteRequest) => boolean;
  readonly _params?: P;
}

export interface OpaquePredicate<P> {
  readonly tag: 'opaque';
  readonly fn: (req: RouteRequest) => P | null;
  readonly _params?: P;
}

export interface AndPredicate<P> {
  readonly tag: 'and';
  readonly left: Predicate<unknown>;
  readonly right: Predicate<unknown>;
  readonly _params?: P;
}

export interface OrPredicate<P> {
  readonly tag: 'or';
  readonly left: Predicate<unknown>;
  readonly right: Predicate<unknown>;
  readonly _params?: P;
}

/** Recover the params type from a predicate. */
export type ParamsOf<Pred> = Pred extends Predicate<infer P> ? P : never;

/**
 * A Location surfaces to render functions.
 * Mirrors a subset of WHATWG URL, hand-parsed on the hot path.
 */
export interface Location {
  readonly href: string;
  readonly pathname: string;
  readonly search: string;
  readonly hash: string;
  readonly query: Readonly<Record<string, string>>;
}

/** What `match()` returns when it hits. */
export interface MatchResult<P> {
  readonly params: P;
  readonly location: Location;
}

/** A route binds a predicate to a render function. */
export interface Route<P> {
  readonly match: Predicate<P>;
  readonly render: (ctx: MatchResult<P>) => unknown;
  readonly redirect?: string | ((ctx: MatchResult<P>) => string);
}
