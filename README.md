[![npm version](https://badge.fury.io/js/buttermilk.svg)](https://badge.fury.io/js/buttermilk) [![build status](https://api.travis-ci.org/probablyup/buttermilk.svg)](https://travis-ci.org/probablyup/buttermilk) [![codecov](https://codecov.io/gh/probablyup/buttermilk/branch/master/graph/badge.svg)](https://codecov.io/gh/probablyup/buttermilk) [![downloads](https://img.shields.io/npm/dm/buttermilk.svg)](https://npm-stat.com/charts.html?package=buttermilk)

# buttermilk

<!-- TOC -->

-   [buttermilk](#buttermilk)
    -   [installation](#installation)
    -   [usage](#usage)
        -   [basic example](#basic-example)
        -   [writing route configurations](#writing-route-configurations)
        -   [components](#components)
            -   [`<Router>`](#router)
            -   [`<RoutingState>`](#routingstate)
            -   [`<Link>`](#link)
        -   [utilities](#utilities)
            -   [`match(routes, url)`](#matchroutes-url)
            -   [`route()`](#route)
        -   [holistic example](#holistic-example)
        -   [without a bundler](#without-a-bundler)
    -   [more examples](#more-examples)
    -   [goals](#goals)

<!-- /TOC -->

## installation

Grab the `buttermilk` NPM module with your favorite package manager.

```
npm i buttermilk
```

## usage

Setting up `buttermilk` involves placing a `<Router>` component on your page and feeding it an array of route definitions. If you learn better by reverse engineering, check out the [holistic example](#holistic-example).

### basic example

```jsx
import { Router } from 'buttermilk';
import React from 'react';

// whatever your folder structure looks like, etc.
import FooPage from '../foo';
import NotFoundPage from '../404';

class App extends React.Component {
    render() {
        return (
            <Router
                routes={[
                    {
                        path: '/foo',
                        render: () => FooPage,
                    },
                    {
                        path: '*',
                        render: () => NotFoundPage,
                    },
                ]}
            />
        );
    }
}
```

With the above setup, a URL like `"https://yoursite.com/foo"` would trigger the `FooPage` component to be rendered. All other paths would trigger the `NotFoundPage` component.

### writing route configurations

Buttermilk has a highly flexible matching system, offering the following flavors of routing:

| flavor             | syntax                        |
| ------------------ | ----------------------------- |
| static             | `"/foo"`                      |
| dynamic fragments  | `"/foo/:id"`                  |
| optional fragments | `"/foo(/bar)"`                |
| wildcard           | `"/foo*"`                     |
| splat              | `"/foo/**/bar.html"`          |
| query string       | `"?foo=bar"`                  |
| fallback           | `"*"`                         |
| function callback  | `yourValidationFunction(url)` |
| regex              | `/^(?=bar)\/foo/`             |

The only hard rule is there must be a fallback route at the end of the routing chain: `path: "*"`. Otherwise, you are free to compose routes as it makes sense for your app.

A route configuration can take two forms:

-   A route that renders something:

    ```js
    {
      path: String | RegExp | Function,
      render: Function,
    }

    // example

    {
      path: "/",
      render: () => "Hello world!",
    }
    ```

    Return whatever you'd like from the `render` function. A few ideas:

    -   A React component class

        ```js
        render: () => HelloWorldPage,
        ```

    -   Some JSX

        ```jsx
        render: () => <div>Hi!</div>,
        ```

    -   A string

        ```js
        render: () => 'Howdy!',
        ```

    -   A promise resolving to one of the above (great for loading pages on-demand and reducing initial bundle size)

        ```js
        render: () => import('./HelloWorld').then(mdl => mdl.default),
        ```

    If it's a component class, Buttermilk will inject the [routing context](#routingstate) as props.

-   A route that redirects to another path:

    ```js
    {
      path: String | RegExp | Function,
      redirect: String,
    }

    // example

    {
      path: "/bar",
      redirect: "/",
    }
    ```

You may also pass any other properties you'd like inside the route configuration object and they will be available to the `RoutingState` higher-order component, routing callbacks, etc.

### components

#### `<Router>`

The gist of Buttermilk's router is that it acts like a controlled component when used server-side (driven by `props.url`) and an uncontrolled one client-side (driven by the value of `window.location.href` and intercepted navigation events.)

In the browser, use either a `<Link>` component or the `route()` utility method to change routes. The router will also automatically pick up `popstate` events caused by user-driven browser navigation (forward, back buttons, etc.)

Available props:

```js
/**
 * Provide a spinner or something to look at while the promise
 * is in flight if using async routes.
 */
loadingComponent: PropTypes.oneOfType([
  PropTypes.func,
  PropTypes.string,
]),

/**
 * An optional app runtime component. Think of it like
 * the "shell" of your app, so perhaps the outer container,
 * nav bar, etc. You'll probably want to put any "Provider"
 * type components here that are intended to wrap your
 * whole application.
 */
outerComponent: PropTypes.oneOfType([
  PropTypes.func,
  PropTypes.string,
]),

routes: PropTypes.arrayOf(
  PropTypes.shape({

    /**
     * A RegExp, string, or function accepting the URL as
     * an argument and returning a boolean if valid.
     */
    path: PropTypes.oneOfType([
      PropTypes.instanceOf(RegExp),
      PropTypes.string,
      PropTypes.func,
    ]).isRequired,

    /**
     * A string URL path to a different route. If this is given,
     * then "render" is not required.
     */
    redirect: PropTypes.string,

    /**
     * A function that returns one of the following:
     *
     * 1. JSX.
     * 2. A React component class.
     * 3. A promise resolving to JSX or a React component class.
     */
    render: PropTypes.func,
  }),
).isRequired,

/**
 * A hook for reacting to an impending route transition.
 * Accepts a promise and will pause the route transition
 * until the promise is resolved. Return false or reject
 * a given promise to abort the routing update.
 *
 * Provides currentRouting and nextRouting as arguments.
 */
routeWillChange: PropTypes.func,

/**
 * A hook for reacting to a completed route transition. It
 * might be used for synchronizing some global state if
 * desired.
 *
 * Provides currentRouting and previousRouting as arguments.
 */
routeDidChange: PropTypes.func,

/**
 * A hook for synchronizing initial routing state.
 *
 * Providers initialRouting as an argument.
 */
routerDidInitialize: PropTypes.func,

/**
 * The initial URL to be used for processing, falls back to
 * window.location.href for non-SSR. Required for
 * environments without browser navigation eventing, like Node.
 */
url: PropTypes.string,
```

#### `<RoutingState>`

A render prop higher-order component (HOC) for arbitrarily consuming routing state.

```jsx
<RoutingState>
    {routingProps => {
        // routingProps.location
        // (the parsed current URL in window.location.* form)

        // routingProps.params
        // (any extracted dynamic params from the URL)

        // routingProps.route
        // (the current route)

        return /* some JSX */;
    }}
</RoutingState>
```

#### `<Link>`

A polymorphic anchor link component. On click/tap/enter if the destination matches a valid route, the routing context will be modified and the URL updated without reloading the page. Otherwise, it will act like a normal anchor link.

> A _polymorphic_ component is one that can change shape as part of its public API. In the case of `<Link>`, `props.as` allows the developer to pass in their own base link component if desired.
>
> This might make sense if you use a library like [styled-components](https://www.styled-components.com/) and want to make a shared, styled anchor link component.

If something other than an anchor tag is specified via `props.as`, a `[role="link"]` attribute will be added for basic assistive technology support.

Adds `[data-active]` if the given href matches the active route.

```jsx
<Link as="button" href="/somewhere" target="_blank">
    Somewhere over the rainbow…
</Link>
```

Available props:

```js
/**
 * An HTML tag name or valid ReactComponent class to
 * be rendered. Must be compatible with React.createElement.
 *
 * Defaults to an anchor "a" tag.
 */
as: PropTypes.oneOfType([
  PropTypes.func,
  PropTypes.string,
]),

/**
 * A valid relative or absolute URL string.
 */
href: PropTypes.string.isRequired,

/**
 * Any valid value of the anchor tag "target" attribute.
 *
 * See: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a#attr-target
 *
 * Defaults to "_self".
 */
target: PropTypes.string,
```

An example using a styled-components element base:

```js
import { Link } from 'buttermilk';
import styled from 'styled-components';

const Anchor = styled.a`
    color: red;
`;

export default function StyledButtermilkLink(props) {
    return <Link {...props} as={Anchor} />;
}
```

### utilities

#### `match(routes, url)`

This is an advanced API meant primarily for highly-custom server side rendering use cases. Provide your array of route defintions and the fully-resolved URL to receive the matched route, route context, and any suggested redirect.

```js
import { match } from 'buttermilk';

const url = 'https://fizz.com/buzz';

const routes = [
    {
        path: '/foo',
        render: () => FooPage,
    },
    {
        path: '/bar',
        render: () => BarPage,
    },
    {
        path: '*',
        render: () => NotFoundPage,
    },
];

const { location, params, redirect, route } = match(routes, url);
```

When using this API, you'll probably want to have a more streamlined `<Router>` setup for the server since we're doing all the work upfront to find the correct route:

```js
import { match, Router } from 'buttermilk';
import React from 'react';
import ReactDOMServer from 'react-dom/server';

import routes from '../routes';

/**
 * An example express middleware.
 */
export default function renderingMiddleware(req, res, next) {
    const url = req.protocol + '//' + req.get('host') + req.originalUrl;

    const { location, params, redirect, route } = match(routes, url);

    if (redirect) return res.redirect(redirect);

    const html = ReactDOMServer.renderToString(
        <Router
            url={url}
            routes={[
                {
                    ...route,
                    path: '*',
                },
            ]}
        />,
    );

    /**
     * route.title below is an example arbitrary prop
     * you could add to the route configuration if desired
     */
    res.send(`
    <!doctype html>
    <html>
      <head><title>${route.title}</title></head>
      <body>${html}</body>
    </html>
  `);
}
```

#### `route()`

Use this API to programmatically change the route browser-side. It uses `pushState` or `replaceState` under the hood, depending on if you pass the second argument. Defaults to creating a new browser history entry.

```js
// signature: route(url: String, addNewHistoryEntry: Boolean = true)

route('/some/other/url');
```

### holistic example

See it live: <https://codesandbox.io/s/20q311nn6n>

```jsx
/* Home.js */
export default () => 'Home';

/* index.js */
import React from 'react';
import ReactDOM from 'react-dom';

import { Router, RoutingState, Link } from 'buttermilk';

const App = props => (
    <div>
        <header>
            <h1>My sweet website</h1>
        </header>

        <nav>
            <Link href="/">Home</Link>
            <Link href="/blep/kitter">Kitter Blep!</Link>
            <Link href="/blep/corg">Corg Blep!</Link>
        </nav>

        <main>{props.children}</main>
    </div>
);

const NotFound = () => (
    <div>
        <h2>Oh noes, a 404 page!</h2>
        <RoutingState>
            {routing => (
                <p>
                    No page was found with the path:
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
        render: () => import('./Home').then(mdl => mdl.default),
    },
    {
        path: '/blep/:animal',
        render: routing => (
            <img
                alt="Bleppin'"
                src={
                    routing.params.animal === 'corg'
                        ? 'http://static.damnlol.com/media/bc42fc943ada24176298871de477e0c6.jpg'
                        : 'https://i.imgur.com/OvbGwwI.jpg'
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

ReactDOM.render(<Router routes={routes} outerComponent={App} />, root);
```

### without a bundler

You can also use consume Buttermilk from a CDN like unpkg:

```
https://unpkg.com/buttermilk@1.1.1/dist/standalone.js
https://unpkg.com/buttermilk@1.1.1/dist/standalone.min.js
```

The exports will be accessible at `window.Buttermilk`. Note that this requires `react >= 16.3` (`window.React`) and `prop-types` (`window.PropTypes`) to also be accessible in the `window` scope.

Both the minified and development versions ship with source maps for ease of debugging.

## more examples

-   holistic example + animated route transitions: <https://codesandbox.io/s/30llnkwj5q>
-   using Buttermilk, React, etc from CDN: <https://codesandbox.io/s/p96j9159lq>

## goals

-   centrally-managed routing
-   fast
-   first-class async support
-   HMR-friendly
-   obvious API
-   small
-   SSR
