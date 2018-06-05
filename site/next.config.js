const webpack = require('webpack')

module.exports = {
  webpack(config) {
    config.plugins.push(
      new webpack.DefinePlugin({
        'VERSION': JSON.stringify(require('../package.json').version)
      })
    )

    return config
  }
}
