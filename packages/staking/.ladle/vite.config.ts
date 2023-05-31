import checker from 'vite-plugin-checker';
import eslint from 'vite-plugin-eslint';

export const ladleViteConfig = {
  plugins: [
    checker({
      overlay: {
        position: 'br',
      },
      typescript: {
        root: '../',
      },
    }),
    eslint(),
  ],
};

export default ladleViteConfig;
