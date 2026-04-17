// Minimal URL parsing — hand-rolled to avoid `new URL()` and
// `URLSearchParams` on the hot path.
//
// Handles absolute URLs (http://host/path?q#h), protocol-relative, and
// path-only (/path?q#h). Good enough for match-time work; full-blown URL
// handling belongs to consumers who need it.

import type { Location } from './types.ts';

const EMPTY_QUERY: Readonly<Record<string, string>> = Object.freeze({});

/** Parse `url` into `{ href, pathname, search, hash, query }`. */
export function parseUrl(url: string): Location {
  // Strip origin if present; we only care about pathname onwards.
  let rest: string;
  let proto = url.indexOf('://');
  if (proto !== -1) {
    const pathStart = url.indexOf('/', proto + 3);
    rest = pathStart === -1 ? '/' : url.slice(pathStart);
  } else {
    rest = url;
  }

  let pathname = rest;
  let search = '';
  let hash = '';

  const hashAt = pathname.indexOf('#');
  if (hashAt !== -1) {
    hash = pathname.slice(hashAt);
    pathname = pathname.slice(0, hashAt);
  }
  const queryAt = pathname.indexOf('?');
  if (queryAt !== -1) {
    search = pathname.slice(queryAt);
    pathname = pathname.slice(0, queryAt);
  }
  if (pathname === '') pathname = '/';

  return {
    href: url,
    pathname,
    search,
    hash,
    query: parseQuery(search),
  };
}

function parseQuery(search: string): Readonly<Record<string, string>> {
  if (search.length < 2) return EMPTY_QUERY;
  const out: Record<string, string> = {};
  let i = 1; // skip leading '?'
  while (i < search.length) {
    let amp = search.indexOf('&', i);
    if (amp === -1) amp = search.length;
    const eq = search.indexOf('=', i);
    if (eq === -1 || eq > amp) {
      out[decodeURIComponent(search.slice(i, amp))] = '';
    } else {
      out[decodeURIComponent(search.slice(i, eq))] = decodeURIComponent(search.slice(eq + 1, amp));
    }
    i = amp + 1;
  }
  return out;
}
