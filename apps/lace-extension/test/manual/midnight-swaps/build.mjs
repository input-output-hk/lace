import { copyFile } from 'node:fs/promises';

import webpack from 'webpack';

import config from './webpack.config.mjs';

const compiler = webpack(config);
compiler.run((error, stats) => {
  compiler.close(async closeError => {
    if (error || closeError || stats?.hasErrors()) {
      process.stderr.write(
        String(
          error ?? closeError ?? stats.toString({ all: false, errors: true }),
        ) + '\n',
      );
      process.exitCode = 1;
      return;
    }
    try {
      await copyFile(
        new URL('./index.html', import.meta.url),
        new URL('./dist/index.html', import.meta.url),
      );
      process.stdout.write(
        stats.toString({ all: false, timings: true, warnings: true }) + '\n',
      );
    } catch (copyError) {
      process.stderr.write(String(copyError) + '\n');
      process.exitCode = 1;
    }
  });
});
