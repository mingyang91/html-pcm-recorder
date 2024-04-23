const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

module.exports = {
  entry: {
    index: './es/index.js',
    recorderWorkletProcessor: './es/recorderWorkletProcessor.js'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
  },
	plugins: [
    new HtmlWebpackPlugin({ 
      template: './public/index.html',
      filename: `index.html`,
      chunks: ['index']
    }), 
    new webpack.DefinePlugin({
      'process.env.DEBUG': JSON.stringify(process.env.DEBUG),
      'process.env.NODE_DEBUG': JSON.stringify(process.env.NODE_DEBUG),
    })
    // new webpack.ProvidePlugin({
    //   Buffer: ['buffer', 'Buffer'],
    //   process: 'process/browser',
    // }),
  ],
	mode: 'development',
  // resolve: {
  //   fallback: {
  //     assert: require.resolve('assert'),
  //     fs: false,
  //     buffer: require.resolve('buffer/'),
  //     util: require.resolve('util'),
  //     stream: require.resolve('stream-browserify'),
  //     process: require.resolve('process/browser'),
  //   }
  // }
};