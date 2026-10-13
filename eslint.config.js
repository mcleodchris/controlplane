import js from '@eslint/js';
import globals from 'globals';

const rawHtmlWrites = [
  {
    selector: "AssignmentExpression[left.property.name=/^(innerHTML|outerHTML)$/]",
    message: 'Build markup with html`` and write it with render() from src/lib/html/html.js (see docs/adr/0001).',
  },
  {
    selector: "CallExpression[callee.property.name='insertAdjacentHTML']",
    message: 'Build markup with html`` and write it with render() from src/lib/html/html.js (see docs/adr/0001).',
  },
];

export default [
  { ignores: ['dist/', 'node_modules/'] },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser },
    },
    rules: {
      'no-restricted-syntax': ['warn', ...rawHtmlWrites],
    },
  },
  {
    files: ['src/lib/html/html.js'],
    rules: { 'no-restricted-syntax': 'off' },
  },
  {
    files: ['*.config.js', 'scripts/**/*.js'],
    languageOptions: { globals: { ...globals.node } },
  },
];
