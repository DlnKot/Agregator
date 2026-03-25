'use strict';

const vueParser = require('vue-eslint-parser');

module.exports = [
  {
    ignores: [
      '**/node_modules/**',
      'dist/**',
      'dist-renderer/**'
    ]
  },

  // CommonJS (Electron main/preload, scripts)
  {
    files: ['src/main/**/*.js', 'src/preload/**/*.js', 'scripts/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs'
    },
    rules: {}
  },

  // ESM (Vite/Vue renderer)
  {
    files: ['src/renderer-vue/src/**/*.js', 'vite.config.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module'
    },
    rules: {}
  },

  // Vue SFCs (syntax checking)
  {
    files: ['src/renderer-vue/src/**/*.vue'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: vueParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
      }
    },
    plugins: {
      vue: require('eslint-plugin-vue')
    },
    rules: {}
  }
];
