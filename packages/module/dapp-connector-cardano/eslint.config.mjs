import { defineConfig } from 'eslint/config';

import rootConfig from '../../../eslint.config.mjs';

export default defineConfig(
  rootConfig,
  {
    // Browser-IIFE source for the WebView CIP-30 runtime. It is read as text by
    // the generator (never imported), targets the WebView's browser globals, and
    // is not part of the package's TS project — so it must not be type-aware
    // linted here.
    ignores: ['scripts/cip30-injection.webview.js'],
  },
  {
    // Note: do NOT include *.mjs here. This config enables TS type-aware linting
    // via `parserOptions.project`, and scripts/*.mjs is intentionally not part of
    // the TS project.
    files: ['**/*.{js,jsx,ts,tsx,mts,cts,cjs}'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.eslint.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
);
