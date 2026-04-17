import migrating from '../../../../MIGRATING.md?raw';
import { MarkdownPage } from '../MarkdownPage.tsx';
import { useDocumentHead } from '../useDocumentHead.ts';

export function Migrating() {
  useDocumentHead({
    title: 'Migrating from buttermilk v2 to v3',
    description:
      'Upgrade guide for buttermilk v2 to v3: package split, predicate-based routes, wildcard semantics, React 19 peer dep, ESM-only.',
  });
  return <MarkdownPage source={migrating} />;
}
