const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

module.exports = {
    watch: true,
    entry: './src/index.js',
    output: {
        path: path.resolve(__dirname, 'build'),
        filename: 'bundle.js'
    },
    devtool: 'source-map',
    module: {
        rules: [
            {
                test: /\.(txt)$/,
                use: 'raw-loader'
            },
            {
                test: /\.(glsl|vs|fs)$/,
                loader: 'shader-loader',
            },
            {
                test: /\.(js|jsx)$/,
                exclude: /node_modules/,
                use: ['babel-loader'],
            },
            {
                test: /\.s[ac]ss$/i,
                exclude: /node_modules/,
                use: [
                    "style-loader",
                    "css-loader",
                    "sass-loader",
                ],
            },
            {
                test: /\.(png|jp(e*)g|svg|gif)$/,
                use: [
                    {
                        loader: 'file-loader',
                        options: {
                            name: 'images/[hash]-[name].[ext]',
                        },
                    },
                ],
            },
            {
                test: /\.worker\.js$/,
                loader: 'worker-loader',
                options: {
                    filename: '[name].[contenthash].worker.js',
                },
            },
        ],
    },
    resolve: {
        extensions: ['*', '.js', '.jsx'],
    },
    plugins: [
        new CleanWebpackPlugin(),
        new HtmlWebpackPlugin(
            {
                hash: true,
                title: 'Scrollable canvas',
                template: './index.html',
                favicon: "./src/assets/favicon.ico"
            }
        ),
        new webpack.HotModuleReplacementPlugin()
    ],
    devServer: {
        index: 'index.html',
        contentBase: path.resolve(__dirname, './build'),
        historyApiFallback: true,
        hot: true
    },
};