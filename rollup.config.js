const { nodeResolve } = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const babel = require('@rollup/plugin-babel');

module.exports = {
  input: 'src/index.js',
  output: {
    file: 'dist/index.js',
    format: 'cjs',
  },
  external: [
    '@babel/generator',
    '@babel/parser',
    '@babel/traverse',
    '@babel/types',
    'glob',
    'fs',
    'child_process'
  ],
  plugins: [
    nodeResolve(),
    commonjs(),
    babel({
      babelHelpers: 'bundled',
      presets: ['@babel/preset-env']
    })
  ]
};