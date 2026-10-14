import js from '@eslint/js'
import globals from 'globals'
import parser from '@typescript-eslint/parser'
import plugin from '@typescript-eslint/eslint-plugin'

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.dist*/**',
      '**/.input/**',
      '.beads/**',
      'test-results/**',
      'coverage/**',
      'packages/components/src/vendor/**',
    ],
  },
  {
    ...js.configs.recommended,
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser,
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: { '@typescript-eslint': plugin },
    rules: {
      ...plugin.configs.recommended.rules,
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
]
