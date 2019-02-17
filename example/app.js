import React from 'react';
import ReactDOM from 'react-dom';

import { Router, RoutingState, Link } from '../src';

const App = props => (
  <div>
    <header>
      <h1>My sweet website</h1>
    </header>

    <nav>
      <Link href="/">Home</Link>
      &nbsp;
      <Link href="/blep/kitter">Kitter Blep!</Link>
      &nbsp;
      <Link href="/blep/corg">Corg Blep!</Link>
    </nav>

    <main>{props.children}</main>
  </div>
);

const NotFound = () => (
  <div key="404">
    <h2>Oh noes, a 404 page!</h2>
    <RoutingState>
      {routing => (
        <p>
          No page was found with the path:&nbsp;
          <code>{routing.location.pathname}</code>
        </p>
      )}
    </RoutingState>

    <p>
      <Link href="/">Let's go back home.</Link>
    </p>
  </div>
);

const routes = [
  {
    path: '/',
    render: () => React.lazy(() => import('./home')),
  },
  {
    path: '/blep/:animal',
    render: routing => (
      <img
        style={{
          height: 300,
          width: 'auto',
          position: 'absolute',
          top: 100,
          left: 0,
        }}
        alt="Bleppin'"
        key={`blep-${routing.params.animal}`}
        src={
          routing.params.animal === 'corg' ? 'https://i.redd.it/bkyiqodm3j5z.jpg' : 'https://i.imgur.com/OvbGwwI.jpg'
        }
      />
    ),
  },
  {
    path: '*',
    render: () => NotFound,
  },
];

const root = document.body.appendChild(document.createElement('div'));

ReactDOM.render(
  <Router
    routes={routes}
    outerComponent={App}
    routeDidChange={(...args) => console.log('routeDidChange', ...args)}
    routeWillChange={(...args) => console.log('routeWillChange', ...args)}
    routerDidInitialize={(...args) => console.log('routerDidInitialize', ...args)}
  />,
  root
);
