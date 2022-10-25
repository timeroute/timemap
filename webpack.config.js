const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: "development",
  devtool: 'inline-source-map',
  entry: {
    index: './src/index.ts',
    test: './src/test.ts',
  },
  devServer: {
    static: './dist'
  },
  module: {
    rules: [
      {
        test: /\.glsl$/,
        use: 'raw-loader'
      },
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      title: 'timemap dev'
    })
  ],
  resolve: {
    extensions: ['.ts', '.js'],
  },
  output: {
    filename: 'timemap.[name].js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
  optimization: {
    runtimeChunk: 'single'
  }
};