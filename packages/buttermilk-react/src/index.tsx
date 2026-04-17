// buttermilk-react — React 19 bindings for buttermilk.

export { Router, useRouter, type RouterContext, type RouterProps } from './router.tsx';
export { Link, type LinkProps } from './link.tsx';
export { useRoute, useParams, useLocation, useNavigate } from './hooks.ts';

// Re-export enough of the core that most apps don't need both imports.
export {
  and,
  compile,
  custom,
  findRoute,
  guard,
  matchPredicate,
  matchRoute,
  or,
  p,
  parseUrl,
  path,
  predicate,
  query,
  regex,
} from 'buttermilk';

export type {
  CompiledRouter,
  ExtractParams,
  Location,
  MatchResult,
  ParamsOf,
  Predicate,
  Route,
  RouteRequest,
} from 'buttermilk';
