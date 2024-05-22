import rollupBase from '../../rollup.config';
import packageJson from './package.json';

export default (args) => {
  const baseConfig = rollupBase(args);

  return {
    ...baseConfig,
    output: [
      {
        file: packageJson.main,
        format: 'cjs',
        sourcemap: false
      },
      {
        file: packageJson.module,
        format: 'esm',
        sourcemap: false
      }
    ]
  };
};
