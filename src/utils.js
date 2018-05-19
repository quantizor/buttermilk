import LiteURL from 'lite-url';
import regexify from './regexify';

const PATH_EXTRACTION_R = /:[^/?#()]*/g;

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

export function processRoute(route) {
    return Object.assign({}, route, {
        params: extractParamsFromPath(route.path),
        test: regexify(route.path),
    });
}

export function valid(validator, url) {
    if (validator instanceof RegExp) {
        return validator.test(url);
    } else if (validator instanceof Function) {
        return validator(url);
    }
}

export function getRedirectUrl(redirect, originalUrl) {
    /** Fully-resolved, no work to be done here. */
    if (redirect.includes('://')) return redirect;

    const { protocol, host } = new LiteURL(originalUrl);

    /**
     * Reconstruct a full URL based on the original with the path
     * switched to the given redirect.
     */
    return `${protocol}//${host}${redirect}`;
}

export function findRoute(routes, url) {
    const route = routes.find(route => valid(route.test, url));

    if (route) {
        if (route.redirect) return findRoute(routes, getRedirectUrl(route.redirect, url));
        else return { route, url };
    }

    throw new Error(`No valid routes were found for URL ${url}. Did you forget to define a fallback "*" path?`);
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
 * Generates an object containing a window.location facsimile
 * for the given URL, any parsed route parameters, and the
 * route itself.
 *
 * @returns {Object} RoutingContext
 */
export function createRouteContext(route, url) {
    return {
        location: parseUrl(url),
        params: getRouteParamsForURL(route, url),
        route,
    };
}

/**
 * Given a set of route definitions and a fully-resolved URL,
 * return a routing context object.
 *
 * If a redirect should be performed, the "redirect" key will be
 * set with the appropriate URL.
 *
 * {
 *     location: object,
 *     params: object,
 *     route: object,
 *     redirect: string?,
 * }
 */
export function match(routes, url) {
    const processedRoutes = routes.map(processRoute);

    /**
     * If a redirect occurred, finalUrl may be different from
     * the initial url.
     */
    const { route, url: finalUrl } = findRoute(processedRoutes, url);
    const ret = Object.assign({}, createRouteContext(route, finalUrl));

    if (finalUrl !== url) ret.redirect = finalUrl;

    return ret;
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
export function route(url, addNewHistoryEntry = true) {
    history[addNewHistoryEntry ? 'pushState' : 'replaceState']({}, '', url);

    // this is what triggers the routing to update
    window.dispatchEvent(new Event('popstate'));
}
