import svelte from 'rollup-plugin-svelte'
import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
//import livereload from 'rollup-plugin-livereload'

// TODO: typescript plugin & preprocess

import { componentConfig } from './component-config.js'

export default [
	{
		input: 'src/test.ts',
		output: {
			file: `public/bundle.js`,
			format: 'iife',
			name: 'bundle',
		},
		plugins: [
			svelte({
				include: 'src/**/*.svelte',
				dev: true,
			}),
			resolve(),
			commonjs(),
		],
	},
	componentConfig('public', false),
]
