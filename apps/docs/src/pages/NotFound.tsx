import { Link } from 'buttermilk-react';

export function NotFound() {
  return (
    <div className="doc doc--centered">
      <main className="doc__content">
        <h2>404</h2>
        <p>That route didn’t match any predicate.</p>
        <p>
          <Link href="/">Back to the overview</Link>
        </p>
      </main>
    </div>
  );
}
