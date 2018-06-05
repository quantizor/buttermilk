const webpack = require('webpack')

module.exports = {
  exportPathMap: function(defaultPathMap) {
    return {
      '/': { page: '/' }
    }
  },
  webpack(config) {
    config.plugins.push(
      new webpack.DefinePlugin({
        'VERSION': JSON.stringify(require('../package.json').version)
      })
    )

    return config
  }
}
