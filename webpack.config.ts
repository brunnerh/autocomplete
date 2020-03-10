import { Configuration } from 'webpack';
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const path = require('path');

module.exports = (env: any, argv: Configuration) => <Configuration>{
	entry: {
		bundle: ['./src/main.js']
	},
	resolve: {
		alias: {
			svelte: path.resolve(__dirname, 'node_modules', 'svelte')
		},
		extensions: ['.mjs', '.js', '.svelte', '.ts'],
		mainFields: ['svelte', 'browser', 'module', 'main'],
	},
	output: {
		path: __dirname + '/dist',
		publicPath: '/dist/',
		filename: 'bundle.js',
		chunkFilename: '[name].[id].js',
	},
	devtool: argv.mode == 'production' ? false : 'source-map',
	module: {
		rules: [
			{
				test: /\.svelte$/,
				use: {
					loader: 'svelte-loader',
					options: {
						emitCss: true,
						hotReload: true,
					},
				},
			},
			{
				test: /\.css$/,
				use: [
					/**
					 * MiniCssExtractPlugin doesn't support HMR.
					 * For developing, use 'style-loader' instead.
					 * */
					argv.mode == 'production' ? MiniCssExtractPlugin.loader : 'style-loader',
					'css-loader'
				],
			},
			{ include: /\.ts$/, loader: 'ts-loader' },
		],
	},
	plugins: [
		new MiniCssExtractPlugin({
			filename: '[name].css',
		}),
	],
	devServer: {
	  contentBase: __dirname,
	  compress: true,
	  port: 5001
	},
};