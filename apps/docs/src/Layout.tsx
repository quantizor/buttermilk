import { Link, useLocation } from 'buttermilk-react';
import type { ReactNode } from 'react';

export function Layout({ children }: { children?: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div className="shell">
      <header className="shell__header">
        <h1 className="shell__title">
          <Link href="/">buttermilk</Link>
        </h1>
        <nav className="shell__nav">
          <Link href="/" aria-current={pathname === '/' ? 'page' : undefined}>
            Overview
          </Link>
          <Link
            href="/examples"
            aria-current={pathname === '/examples' ? 'page' : undefined}
          >
            Examples
          </Link>
          <Link
            href="/migrating"
            aria-current={pathname === '/migrating' ? 'page' : undefined}
          >
            Migrating v2 → v3
          </Link>
          <a
            href="https://github.com/quantizor/buttermilk"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
        </nav>
      </header>
      {children}
    </div>
  );
}
