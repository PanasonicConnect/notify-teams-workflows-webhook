// See: https://eslint.org/docs/latest/use/configure/configuration-files

import { fixupPluginRules } from '@eslint/compat'
import _import from 'eslint-plugin-import-x'
import vitest from '@vitest/eslint-plugin'
import prettier from 'eslint-plugin-prettier'
import globals from 'globals'

export default [
  {
    ignores: ['**/coverage', '**/dist', '**/linter', '**/node_modules']
  },
  {
    plugins: {
      import: fixupPluginRules(_import),
      vitest,
      prettier
    },

    languageOptions: {
      globals: {
        ...globals.node,
        ...vitest.environments.env.globals,
        Atomics: 'readonly',
        SharedArrayBuffer: 'readonly'
      },

      ecmaVersion: 2023,
      sourceType: 'module'
    },

    rules: {
      camelcase: 'off',
      ...vitest.configs.recommended.rules,
      'eslint-comments/no-use': 'off',
      'eslint-comments/no-unused-disable': 'off',
      'i18n-text/no-en': 'off',
      'import/no-namespace': 'off',
      'no-console': 'off',
      'no-shadow': 'off',
      'no-unused-vars': 'off',
      'prettier/prettier': 'error'
    }
  }
]
