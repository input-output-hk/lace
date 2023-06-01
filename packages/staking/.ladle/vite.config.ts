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
        root: '../',
      },
    }),
    eslint({
      include: './**/*',
      overrideConfigFile: '.eslintrc.cjs',
    }),
  ],
};

export default ladleViteConfig;
