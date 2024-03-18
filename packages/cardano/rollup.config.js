import rollupBase, { retargetOutputToTmpDirectory } from '../../rollup.config';
import packageJson from './package.json';

export default (args) => {
  const baseConfig = rollupBase(args);

  return {
    ...baseConfig,
    output: [
      {
        file: retargetOutputToTmpDirectory(packageJson.main),
        format: 'cjs',
        sourcemap: true
      },
      {
        file: retargetOutputToTmpDirectory(packageJson.module),
        format: 'esm',
        sourcemap: true
      }
    ]
  };
};
