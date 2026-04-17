// buttermilk v3 — predicate-based routing core.
// Framework-agnostic. React bindings live in `buttermilk-react`.

export type {
  AndPredicate,
  ExtractParams,
  GuardPredicate,
  Location,
  MatchResult,
  OpaquePredicate,
  OrPredicate,
  ParamsOf,
  PathPredicate,
  Predicate,
  QueryPredicate,
  RegexPredicate,
  Route,
  RouteRequest,
} from './types.ts';

export { and, custom, guard, or, p, path, predicate, query, regex } from './predicates.ts';

export { findRoute, matchPredicate, matchRoute } from './match.ts';

export { compile } from './compile.ts';
export type { CompiledRouter } from './compile.ts';

export { parseUrl } from './url.ts';
