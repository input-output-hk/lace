import path from 'path';
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';
import checker from 'vite-plugin-checker';
import eslint from 'vite-plugin-eslint';

export const ladleViteConfig = {
  plugins: [
    vanillaExtractPlugin(),
    checker({
      overlay: {
        position: 'br',
      },
      typescript: {
        root: path.resolve(__dirname, '../'),
      },
    }),
    eslint({
      include: './**/*.{ts,tsx,json}',
      overrideConfigFile: '.eslintrc.cjs',
    }),
  ],
};

export default ladleViteConfig;
