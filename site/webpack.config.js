const history = require('connect-history-api-fallback');
const convert = require('koa-connect');
const HTMLWebpackPlugin = require('html-webpack-plugin');
const path = require('path');

const PROD = process.env.NODE_ENV === 'production';

module.exports = {
    devtool: PROD ? 'none' : 'source-map',
    mode: PROD ? 'production' : 'development',
    module: {
        rules: [{
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

module.exports.serve = {
  content: [__dirname],
  add: (app, middleware, options) => {
    const historyOptions = {
      // ... see: https://github.com/bripkens/connect-history-api-fallback#options
    };

    app.use(convert(history(historyOptions)));
  }
};
