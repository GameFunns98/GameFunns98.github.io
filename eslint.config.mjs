import astro from 'eslint-plugin-astro';
import tsParser from '@typescript-eslint/parser';

export default [
  { ignores: ['.astro/**', 'dist/**', 'node_modules/**', 'playwright-report/**', 'test-results/**'] },
  ...astro.configs['flat/recommended'],
  { files: ['**/*.astro'], languageOptions: { parserOptions: { parser: tsParser } } },
  { files: ['**/*.ts'], languageOptions: { parser: tsParser } },
  { files: ['**/*.{js,mjs,ts,astro}'], rules: { 'no-debugger': 'error' } },
];
