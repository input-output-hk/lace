import path from 'path';
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';
import checker from 'vite-plugin-checker';
import eslint from 'vite-plugin-eslint';
import svgr from 'vite-plugin-svgr';

export const ladleViteConfig = {
  plugins: [
    vanillaExtractPlugin({ esbuildOptions: { loader: { '.css': 'empty' } } }),
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
    svgr({
      svgrOptions: {
        icon: true,
      },
    }),
  ],
};

export default ladleViteConfig;
