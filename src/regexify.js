export default function regexify(path) {
    return new RegExp(
        '^' +
        path
            // escape regex reserved characters
            .replace(/([/.?+])/g, '\\$1')

            // handle query strings: ?foo=bar
            .replace(/\\[?]/, '.*?\\?.*?')

            // handle optional segments: (/bar)
            .replace(/\(([^)]+)\)/g, '(?:$1)?')

            // handle dynamic fragments: /:bar
            .replace(/\/:[^/()#?]*/g, '/([^/]*)')
        + '$'
    );
}
