import { defineConfig } from 'eslint/config';
import reactNativePlugin from 'eslint-plugin-react-native';

import rootConfig from '../../../eslint.config.mjs  ';

export default defineConfig(rootConfig, {
  files: ['**/*.{js,jsx,ts,tsx,mts,cts,mjs,cjs}'],
  plugins: {
    'react-native': reactNativePlugin,
  },
  languageOptions: {
    parserOptions: {
      project: './tsconfig.eslint.json',
      tsconfigRootDir: import.meta.dirname,
    },
  },
  rules: {
    'react-native/no-inline-styles': 'error',
  },
});
