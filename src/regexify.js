export default function regexify(test) {
    return new RegExp(
        '^' +
        test
            // escape regex reserved characters
            .replace(/([/.?+])/g, '\\$1')

            // handle query strings: ?foo=bar
            .replace(/\\[?]/, '.*?\\?.*?')

            // handle optional segments: (/bar)
            .replace(/\(([^)]*)\)/g, '(?:$1)?')

            // handle dynamic fragments: /:bar
            .replace(/\/:[^/)]*/g, '/[^/]*')
        + '$'
    );
}
