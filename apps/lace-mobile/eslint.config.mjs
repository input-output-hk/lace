import nxPlugin from '@nx/eslint-plugin';
import { defineConfig } from 'eslint/config';

import rootConfig from '../../eslint.config.mjs';

/** @type {import('eslint').Linter.Config[]} */
export default defineConfig(
  rootConfig,
  {
    files: ['**/eslint.config.mjs'],
    languageOptions: {
      parserOptions: {
        project: false,
        projectService: false,
      },
    },
  },
  {
    plugins: {
      '@nx': nxPlugin,
    },
  },
  {
    languageOptions: {
      parserOptions: {
        project: './tsconfig.eslint.json',
        tsconfigRootDir: import.meta.dirname,
        allowAutomaticSingleRunInference: true,
      },
    },
  },
  {
    ignores: [
      '.eas-local-debug/**/*',
      '.expo/**/*',
      '.babelrc.js',
      'web-build/**/*',
      'cache/**/*',
      'dist/**/*',
      'android/**/*',
      'ios/**/*',
      'expo-build-plugin/',
      'ios-build-plugin/build/**/*',
    ],
  },
);
