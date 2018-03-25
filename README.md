# buttermilk

<!-- TOC -->

- [buttermilk](#buttermilk)
    - [installation](#installation)
    - [usage](#usage)
        - [configuration](#configuration)
        - [components](#components)
            - [`<Router>`](#router)
            - [`<RoutingState>`](#routingstate)
            - [`<Link>`](#link)
        - [utilities](#utilities)
            - [`route()`](#route)
        - [holistic example](#holistic-example)
    - [goals](#goals)

<!-- /TOC -->

## installation

```
yarn add buttermilk
```

## usage

### configuration

A route should look like this:

```js
{
  path: String | RegExp | Function,
  redirect: String?,
  render: Function?,  // note that this is required if "redirect" is not passed
}
```

Buttermilk has a highly flexible matching system, offering the following flavors of routing:

flavor | syntax
---    | ---
static | `/foo`
dynamic fragments | `/foo/:id`
optional fragments | `/foo(/bar)`
wildcard | `/foo*`
fallback | `*`
splat | `/foo/**/bar.html`
functional | `yourValidationFunction(url)`
regex | `^(?=bar)/foo`
query string | `?foo=bar`

The only rule is there must be a fallback route at the end of the routing chain (`path: '*'`.) Otherwise, you are free to compose routes as it makes sense for your app.

### components

#### `<Router>`

The gist of Buttermilk's router is that it acts like a controlled component when used server-side (driven by `props.url`) and an uncontrolled one client-side (driven by the value of `window.location.href` and intercepted navigation events.)

In the browser, use either a `<Link>` component or the `route()` utility method to change routes. The router will also automatically pick up popstate events caused by user-driven browser navigation (forward, back buttons, etc.)

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
 * An optional app runtime component. Think of it like the "shell" of your
 * app, so perhaps the outer container, nav bar, etc. You'll probably want to
 * put any "Provider" type components here that are intended to wrap your
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
 * A hook for reacting to an impending route transition. Accepts a promise
 * and will pause the route transition until the promise is resolved. Return
 * false or reject a given promise to abort the routing update.
 *
 * Provides currentRouting and nextRouting as arguments.
 */
routeWillChange: PropTypes.func,

/**
 * A hook for reacting to a completed route transition. It might be used
 * for synchronizing some global state if desired.
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
 * window.location.href for non-SSR. Required for environments without
 * browser navigation eventing.
 */
url: PropTypes.string
```

#### `<RoutingState>`

A render prop higher order component (HOC) for arbitrarily-consuming routing state.

```jsx
<RoutingState>
  {routingProps => {
    // routingProps.location  (the parsed current URL in window.location.* form)
    // routingProps.params    (any extracted dynamic params from the URL)
    // routingProps.route     (the current route)

    return /* some JSX */;
  }}
</RoutingState>
```

#### `<Link>`

A polymorphic anchor link component. On click/tap/enter if the destination matches a value route, the routing context will be modified without reloading the page. Otherwise, it will act like a normal anchor link.

If something other than an anchor tag is specified via `props.as`, a `[role="link"]` attribute will be added for basic assistive technology support.

Adds `[data-active]` if the given href matches the active route.

```js
/**
 * An HTML tag name or valid ReactComponent class to be rendered. Must
 * be compatible with React.createElement.
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

```jsx
<Link as="button" href="/somewhere" target="_blank">
  Somewhere over the rainbow…
</Link>
```

### utilities

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
export default () => "Home";

/* index.js */
import React from "react";
import ReactDOM from "react-dom";

import { Router, RoutingState, Link } from "./buttermilk";

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
    path: "/",
    render: () => import("./Home").then(mdl => mdl.default),
  },
  {
    path: "/blep/:animal",
    render: routing => (
      <img
        alt="Bleppin'"
        src={
          routing.params.animal === "corg"
            ? "http://static.damnlol.com/media/bc42fc943ada24176298871de477e0c6.jpg"
            : "https://i.imgur.com/OvbGwwI.jpg"
        }
      />
    ),
  },
  {
    path: "*",
    render: () => NotFound,
  },
];

const root = document.body.appendChild(document.createElement("div"));

ReactDOM.render(<Router routes={routes} outerComponent={App} />, root);
```

## goals

- centrally-managed routing
- fast
- first-class async support
- HMR-friendly
- obvious API
- small
- SSR
