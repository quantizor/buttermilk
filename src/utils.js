import LiteURL from 'lite-url';

const PATH_EXTRACTION_R = /:[^/?#()]*/g;

// TODO: memoize?
export function extractParamsFromPath(path) {
    return (
        path.match(PATH_EXTRACTION_R) || []

    // remove the leading colon
    ).map(param => param.slice(1));
}

export function getRouteParamsForURL(route, url) {
    if (!route.params.length) return {};

    const result = url.match(route.test) || [];

    if (result.length) result.shift(); // discard the catchall result

    return result.reduce((params, result, index) => {
        return (params[route.params[index]] = result), params;
    }, {});
}

export function valid(validator, url) {
    if (validator instanceof RegExp) {
        return validator.test(url);
    } else if (validator instanceof Function) {
        return validator(url);
    }
}

export function findRoute(routes, url) {
    const route = routes.find(route => valid(route.test, url));

    if (route) {
        if (route.redirect) return findRoute(routes, route.redirect);
        else                return { route, url };
    }

    throw new Error(`could not find a route for url ${url}`);
}

export function getDisplayName(Component) {
    return Component.displayName || Component.name || 'Component';
}

export function parseUrl(url) {
    const parsed = new LiteURL(url);

    parsed.query = parsed.search.slice(1).split('&').reduce((params, pair) => {
        if (pair) {
            const idx = pair.indexOf('=');

            params[pair.slice(0, idx)] = pair.slice(idx + 1);
        }

        return params;
    }, {});

    return parsed;
}

/**
 * A client-side method for programmatically updating the routing state.
 *
 * Accepts a new url (absolute or relative) and an optional second boolean
 * parameter controlling if a new browser history entry should be created.
 *
 * If you want to change the routing state on server, just pass a new url to
 * the <Router> component.
 */
// TODO: tests
export function route(url, addNewHistoryEntry = true) {
    history[addNewHistoryEntry ? 'pushState' : 'replaceState']({}, '', url);

    // this is what triggers the routing to update
    window.dispatchEvent(new Event('popstate'));
}
