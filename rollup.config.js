import { merge } from 'lodash';
import babel from 'rollup-plugin-babel';
import commonjs from 'rollup-plugin-commonjs';
import resolve from 'rollup-plugin-node-resolve';
import replace from 'rollup-plugin-replace';
import sourceMaps from 'rollup-plugin-sourcemaps';
import uglify from 'rollup-plugin-uglify';

function generateConfig(overrides, externalHelpers = false) {
    return merge({}, {
        input: 'src/index.js',
        output: {
            file: 'dist/umd.js',
            format: 'umd',
            globals: { react: 'React', 'prop-types': 'PropTypes' },
            name: 'buttermilk',
            sourcemap: true,
        },
        external: ['react', 'prop-types'],
        plugins: [
            resolve(),
            babel({
                babelrc: false,
                plugins: [
                    externalHelpers ? 'external-helpers' : null,
                    'transform-class-properties',
                ].filter(Boolean),
                presets: [
                    ['env', {
                        modules: false,
                    }],
                    'react'
                ],
            }),
            commonjs({
                ignoreGlobal: true,
            }),
            sourceMaps(),
            replace({
                'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
            }),
            uglify(),
        ],
    }, overrides);
}

export default [
    generateConfig({}),
    generateConfig({
        output: {
            file: 'dist/cjs.js',
            format: 'cjs',
        }
    }, true),
    generateConfig({
        output: {
            file: 'dist/es.js',
            format: 'es',
        }
    }, true),
];
