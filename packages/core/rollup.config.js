import rollupBase from '../../rollup.config';
import packageJson from './package.json';
import copy from 'rollup-plugin-copy';
import json from '@rollup/plugin-json';
import url from '@rollup/plugin-url';

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
    ],
    plugins: [
      ...baseConfig.plugins,
      copy({
        targets: [{ src: 'src/ui/lib/translations/en.json', dest: 'dist/translations/' }]
      }),
      json(),
      url({
        limit: 0,
        include: ['**/*.mp4']
      })
    ]
  };
};
