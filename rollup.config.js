import babel from 'rollup-plugin-babel';
import commonjs from 'rollup-plugin-commonjs';
import resolve from 'rollup-plugin-node-resolve';
import replace from 'rollup-plugin-replace';
import sourceMaps from 'rollup-plugin-sourcemaps'
import uglify from 'rollup-plugin-uglify';

const plugins = [
    resolve(),
    babel(),
    commonjs({
        ignoreGlobal: true,
    }),
    sourceMaps(),
    replace({
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
    }),
    uglify(),
]

export default [
    {
        input: 'src/index.js',
        output: {
            file: 'dist/umd.js',
            format: 'umd',
            globals: { react: 'React', 'prop-types': 'PropTypes' },
            name: 'buttermilk',
            sourcemap: true,
        },
        external: ['react', 'prop-types'],
        plugins,
    }, {
        input: 'src/index.js',
        output: {
            file: 'dist/es.js',
            format: 'es',
            sourcemap: true,
        },
        external: ['react', 'prop-types'],
        plugins,
    },
];
