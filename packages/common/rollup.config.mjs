import rollupBase from '@lace/configs/rollup.config.mjs';
import packageJson from './package.json' assert { type: 'json' };

export default (args) => {
  const baseConfig = rollupBase(args);

  return {
    ...baseConfig,
    output: [
      {
        file: packageJson.main,
        format: 'cjs',
        sourcemap: true
      },
      {
        file: packageJson.module,
        format: 'esm',
        sourcemap: true
      }
    ]
  };
};
