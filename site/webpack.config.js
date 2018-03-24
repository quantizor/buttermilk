const history = require('connect-history-api-fallback');
const convert = require('koa-connect');
const HTMLWebpackPlugin = require('html-webpack-plugin');
const path = require('path');

const PROD = process.env.NODE_ENV === 'production';

module.exports = {
    devtool: PROD ? 'none' : 'cheap-module-eval-source-map',
    mode: PROD ? 'production' : 'development',
    module: {
        rules: [{
            exclude: /node_modules/,
            test: /\.js$/,
            use: 'babel-loader',
        }]
    },
    output: {
        path: __dirname + '/public',
        filename: 'bundle.js'
    },
    plugins: [
        new HTMLWebpackPlugin({
            template: './src/index.html',
        })
    ],
}
