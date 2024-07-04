import rollupBase from '../../rollup.config.js';
import packageJson from './package.json';

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
