import readme from '../../../../README.md?raw';
import { MarkdownPage } from '../MarkdownPage.tsx';
import { useDocumentHead } from '../useDocumentHead.ts';

export function Home() {
  useDocumentHead({
    title: 'buttermilk — predicate-based routing for JavaScript and React 19',
    description:
      'buttermilk is a predicate-based router. Routes are { match, render }. Typed params survive composition, and a radix compiler matches in sub-microsecond time.',
  });
  return <MarkdownPage source={readme} />;
}
