import { merge } from 'lodash';
import babel from 'rollup-plugin-babel';
import commonjs from 'rollup-plugin-commonjs';
import resolve from 'rollup-plugin-node-resolve';
import replace from 'rollup-plugin-replace';
import sourceMaps from 'rollup-plugin-sourcemaps';
import uglify from 'rollup-plugin-uglify';

function generateConfig(overrides, minify = false, externalHelpers = false) {
    return merge({}, {
        input: 'src/index.js',
        output: {
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
                    'transform-class-properties',
                ],
                runtimeHelpers: externalHelpers,
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
            minify ? uglify() : null,
        ].filter(Boolean),
    }, overrides);
}

export default [
    generateConfig({
        output: {
            file: 'dist/umd.js',
            format: 'umd',
        }
    }),
    generateConfig({
        output: {
            file: 'dist/umd.min.js',
            format: 'umd',
        }
    }, true),
    generateConfig({
        output: {
            file: 'dist/cjs.js',
            format: 'cjs',
        }
    }, false, true),
    generateConfig({
        output: {
            file: 'dist/cjs.min.js',
            format: 'cjs',
        }
    }, true, true),
    generateConfig({
        output: {
            file: 'dist/es.js',
            format: 'es',
        }
    }, false, true),

    generateConfig({
        output: {
            file: 'dist/es.min.js',
            format: 'es',
        }
    }, true, true),
];
