import babel from 'rollup-plugin-babel';
import commonjs from 'rollup-plugin-commonjs';
import sourceMaps from 'rollup-plugin-sourcemaps'

import pkg from './package.json';

const plugins = [
    babel({
        externalHelpers: true,
    }),
    sourceMaps(),
    commonjs({
        ignoreGlobal: true,
    }),
]

export default [
    {
        input: 'src/index.js',
        output: {
            file: 'dist/cream.js',
            format: 'umd',
            globals: { react: 'React' },
            name: 'cream',
            sourcemap: true,
        },
        external: ['react', 'prop-types'],
        plugins,
    },
];
