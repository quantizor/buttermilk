// Hooks over the router context. All delegate to `useRouter()`, which
// throws a teaching error if called under the react-server condition.

import type { Location, MatchResult } from 'buttermilk';
import { useRouter } from './router.tsx';

/** The active match (params + parsed location), or null if no route hit. */
export function useRoute<P = unknown>(): MatchResult<P> | null {
  return useRouter().result as MatchResult<P> | null;
}

/** Typed params from the active match. Throws if no route matched. */
export function useParams<P = Record<string, string>>(): P {
  const r = useRouter().result;
  if (!r) throw new Error('buttermilk-react: useParams() called with no active route');
  return r.params as P;
}

export function useLocation(): Location {
  const r = useRouter().result;
  if (!r) throw new Error('buttermilk-react: useLocation() called with no active route');
  return r.location;
}

/** Programmatic navigation — equivalent to clicking a matching <Link>. */
export function useNavigate(): (url: string) => void {
  return useRouter().navigate;
}
