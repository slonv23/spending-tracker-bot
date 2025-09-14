import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier/flat';

/** @type {import('eslint').Linter.Config[]} */
export default [
  // Ignore all .cjs files
  {
    ignores: ['**/*.cjs'],
  },

  // ESLint recommended rules
  { name: 'eslint/recommended', ...pluginJs.configs.recommended },

  // TypeScript ESLint recommended rules
  ...tseslint.configs.recommended,

  // Prettier integration
  eslintConfigPrettier,

  {
    name: 'custom-rules',
    rules: {
      'no-debugger': 'off',
      'no-constant-condition': 'warn',
      'no-constant-binary-expression': 'warn',

      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',

      'no-case-declarations': 'error',
      'no-fallthrough': 'error',
      'no-extra-boolean-cast': 'error',
      'prefer-const': 'warn',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
        },
      ],
    },
  },
];
