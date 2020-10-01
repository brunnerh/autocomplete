import type { Configuration } from 'webpack';
import { CleanWebpackPlugin } from 'clean-webpack-plugin';
import { typescript } from 'svelte-preprocess';
const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');

const config = (isProduction: boolean) => (options: ConfigOptions) =>
{
	options = <Required<ConfigOptions>>{
		filename: '[name].js',
		declaration: false,
		minify: false,
		plugins: [],
		...options,
	};

	return <Configuration>{
		entry: options.entry,
		resolve: {
			alias: {
				svelte: path.resolve(__dirname, 'node_modules', 'svelte')
			},
			extensions: ['.svelte', '.ts', '.tsx', '.mjs', '.js', '.jsx', '.css'],
			mainFields: ['svelte', 'browser', 'module', 'main'],
		},
		output: {
			path: __dirname + options.outputDirectory,
			filename: options.filename,
		},
		devtool: isProduction ? false : 'source-map',
		module: {
			rules: [
				{
					test: /\.svelte$/,
					use: {
						loader: 'svelte-loader',
						options: {
							hotReload: !isProduction,
							preprocess: [ typescript() ],
						},
					},
				},
				{
					include: /\.ts$/,
					loader: 'ts-loader',
					options: {
						compilerOptions: {
							declaration: options.declaration,
						}
					},
				},
			],
		},
		optimization: {
			minimize: options.minify,
		},
		plugins: options.plugins,
	};
}

module.exports = (env: any, argv: Configuration) =>
{
	const isProduction = argv.mode == 'production';

	const makeConfig = config(isProduction);

	return [
		// Distribution - dist
		makeConfig({
			entry: { 'autocomplete': './src/index.ts' },
			outputDirectory: '/dist',
			declaration: true,
		}),
		makeConfig({
			entry: { 'autocomplete.min': './src/index.ts' },
			outputDirectory: '/dist',
			minify: true,
		}),

		// Test Page - public
		makeConfig({
			entry: {
				'bundle': './src/test.ts',
				'autocomplete': './src/index.ts',
			},
			outputDirectory: '/public',
			minify: false,
			plugins: [
				new CleanWebpackPlugin(),
				new HtmlWebpackPlugin({
					template: './src/index.html',
				}),
			],
		}),
	];
};

interface ConfigOptions
{
	entry: Configuration['entry'];
	outputDirectory: string;
	filename?: string,
	minify?: boolean;
	declaration?: boolean;
	plugins?: Configuration['plugins'];
}