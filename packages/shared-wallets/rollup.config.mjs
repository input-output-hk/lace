import rollupBase from '@lace/configs/rollup.config.mjs';
import packageJson from './package.json' assert { type: 'json' };

export default () => {
  const baseConfig = rollupBase({
    tsPluginOptions: {
      composite: false,
      exclude: ['**/*.stories.tsx'],
      tsconfig: './tsconfig.json',
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
