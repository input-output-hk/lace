import rollupBase from '../configs/rollup.config.js';
import packageJson from './package.json';

export default () => {
  const baseConfig = rollupBase({
    tsPluginOptions: {
      composite: false,
      exclude: ['**/*.stories.tsx'],
    },
  });

  return {
    ...baseConfig,
    output: [
      {
        file: packageJson.main,
        format: 'cjs',
        sourcemap: true,
      },
      {
        file: packageJson.module,
        format: 'esm',
        sourcemap: true,
      },
    ],
  };
};
