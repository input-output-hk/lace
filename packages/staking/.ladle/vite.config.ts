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
        root: './',
        tsconfigPath: './tsconfig.json',
      },
    }),
    eslint({
      include: './**/*',
      exclude: './**/*.scss',
      overrideConfigFile: '.eslintrc.cjs',
    }),
  ],
};

export default ladleViteConfig;
