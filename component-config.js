import svelte from 'rollup-plugin-svelte'
import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
import { terser } from 'rollup-plugin-terser';

export function componentConfig(outputDirectory)
{
	return {
		input: 'src/index.js',
		output: {
			file: `${outputDirectory}/autocomplete.js`,
			format: 'es',
			name: 'autocomplete',
		},
		plugins: [
			svelte({
				include: 'src/**/*.svelte',
			}),
			resolve(),
			commonjs(),
			terser(),
		],
	}
};