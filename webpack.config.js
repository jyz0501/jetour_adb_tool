const path = require('path');

module.exports = {
  entry: './js/adb-impl.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'adb-bundle.js',
    library: 'AdbImpl',
    libraryTarget: 'umd'
  },
  mode: 'production',
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      }
    ]
  },
  resolve: {
    fallback: {
      "stream": false,
      "crypto": false,
      "util": false,
      "path": false,
      "fs": false
    },
    extensions: ['.js', '.json']
  },
  target: 'web',
  performance: {
    hints: false
  }
};
