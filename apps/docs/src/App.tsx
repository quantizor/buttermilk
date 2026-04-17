import { Router, p } from 'buttermilk-react';
import { Layout } from './Layout.tsx';
import { Home } from './pages/Home.tsx';
import { Examples } from './pages/Examples.tsx';
import { Migrating } from './pages/Migrating.tsx';
import { NotFound } from './pages/NotFound.tsx';

const routes = [
  {
    match: p('/'),
    render: () => (
      <Layout>
        <Home />
      </Layout>
    ),
  },
  {
    match: p('/examples'),
    render: () => (
      <Layout>
        <Examples />
      </Layout>
    ),
  },
  {
    match: p('/migrating'),
    render: () => (
      <Layout>
        <Migrating />
      </Layout>
    ),
  },
  {
    match: p('/**'),
    render: () => (
      <Layout>
        <NotFound />
      </Layout>
    ),
  },
];

export function App() {
  return <Router routes={routes} />;
}
