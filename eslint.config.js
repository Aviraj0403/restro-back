import { defineConfig } from 'eslint/config';

export default defineConfig([
  {
    languageOptions: {
      globals: {
        node: 'readonly',  // Node.js globals
        browser: 'readonly',  // Browser globals
        es2021: 'readonly',  // ECMAScript 2021 globals
      },
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module', // for ES Modules
      },
    },

    extends: ['eslint:recommended', 'plugin:react/recommended', '@eslint/js/recommended'],
    plugins: ['react'], // Ensure eslint-plugin-react is correctly referenced
    rules: {
      // Add any additional custom rules here
    },
  },

  {
    files: ['**/*.{js,mjs,cjs,jsx}'],
    languageOptions: {
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    extends: ['eslint:recommended', 'plugin:react/recommended', '@eslint/js/recommended'],
    plugins: ['react'], // Ensure eslint-plugin-react is correctly referenced
    rules: {
      // Any file-specific rules go here
    },
  },
]);
