import svelte from 'rollup-plugin-svelte'
import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
import autoPreprocess from 'svelte-preprocess';
import typescript from '@rollup/plugin-typescript';
import { terser } from 'rollup-plugin-terser';

/**
 * Generates rollup config for standalone component module.
 * @param {string} outputDirectory The output directory name.
 * @param {boolean} minify Whether to minify output.
 */
export function componentConfig(outputDirectory, minify)
{
	return {
		input: 'src/index.ts',
		output: {
			file: `${outputDirectory}/autocomplete${minify ? '.min' : ''}.js`,
			format: 'es',
			name: 'autocomplete',
		},
		plugins: [
			typescript({
				
			}),
			svelte({
				include: 'src/**/*.svelte',
				preprocess: autoPreprocess(),
			}),
			resolve(),
			commonjs(),
			minify ? terser() : undefined,
		],
	}
};