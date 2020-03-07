import svelte from 'rollup-plugin-svelte'
import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
//import livereload from 'rollup-plugin-livereload'

import { componentConfig } from './component-config.js'

export default [
	{
		input: 'src/test.js',
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
