import { dirname } from 'path';
import { fileURLToPath } from 'url';

import tseslint from 'typescript-eslint';

// Import the root config
import rootConfig from '../../eslint.config.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default tseslint.config(
  ...rootConfig,
  {
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      'unicorn/prefer-module': 'off',
      '@nx/enforce-module-boundaries': 'off',
    },
  },
  { ignores: ['**/files/**/*', '**/files/*.*'] },
  // Files overrides
  {
    files: ['*.ts', '*.tsx', '*.js', '*.jsx'],
    // No additional configurations for now
  },
  // TODO: These rules are needed, but the JSON parser needs configuring and possibly installing. See LW-12682.
  // {
  //   files: ['*.json'],
  //   languageOptions: {
  //     parser: jsonParser,
  //   },
  //   rules: {
  //     '@nx/dependency-checks': 'error',
  //   },
  // },
  // {
  //   files: ['./package.json', './generators.json'],
  //   languageOptions: {
  //     parser: jsonParser,
  //   },
  //   rules: {
  //     '@nx/nx-plugin-checks': 'error',
  //   },
  // },
);
