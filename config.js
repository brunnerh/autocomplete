import svelte from 'rollup-plugin-svelte'
import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
import { terser } from 'rollup-plugin-terser';

/**
 * Generates rollup config.
 * @param {string} outputDirectory The output directory name.
 * @param {boolean} minify Whether to minify output.
 */
export function config(outputDirectory, minify)
{
	return {
		input: 'src/main.js',
		output: {
			file: `${outputDirectory}/bundle.js`,
			format: 'iife',
			name: 'bundle',
		},
		plugins: [
			svelte({
				include: [
					'src/**/*.svelte',
				]
			}),
			resolve(),
			commonjs(),
			minify ? terser() : undefined,
		],
	}
};