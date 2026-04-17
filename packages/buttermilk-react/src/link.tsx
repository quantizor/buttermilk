// <Link> — isomorphic anchor. Under RSC it's a plain `<a href>` (navigation
// falls back to the browser). Under the client runtime it intercepts
// left-clicks and calls `router.navigate()`; modifier-clicks and
// middle-/right-clicks fall through unchanged.

import * as React from 'react';
import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from 'react';
import { useRouter } from './router.tsx';

declare const __BROWSER__: boolean;

const IS_RSC =
  typeof __BROWSER__ !== 'undefined' && __BROWSER__
    ? false
    : typeof (React as { useRef?: unknown }).useRef !== 'function';

export interface LinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  readonly href: string;
  readonly children?: ReactNode;
}

function ServerLink({ href, children, ...rest }: LinkProps): ReactNode {
  return (
    <a href={href} {...rest}>
      {children}
    </a>
  );
}

function ClientLink({ href, onClick, children, ...rest }: LinkProps): ReactNode {
  const { navigate } = useRouter();

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented) return;
    if (e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (rest.target && rest.target !== '_self') return;
    e.preventDefault();
    navigate(href);
  };

  return (
    <a href={href} onClick={handleClick} {...rest}>
      {children}
    </a>
  );
}

export const Link: (props: LinkProps) => ReactNode = IS_RSC ? ServerLink : ClientLink;
