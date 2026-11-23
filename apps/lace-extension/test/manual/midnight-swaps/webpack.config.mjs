import path from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = fileURLToPath(new URL('.', import.meta.url));

export default {
  mode: 'development',
  devtool: 'source-map',
  target: 'web',
  entry: path.join(directory, 'app.ts'),
  output: {
    path: path.join(directory, 'dist'),
    filename: 'app.js',
    clean: true,
  },
  resolve: { extensions: ['.ts', '.js'] },
  experiments: { asyncWebAssembly: true },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: {
          loader: 'ts-loader',
          options: {
            configFile: path.join(directory, 'tsconfig.json'),
            transpileOnly: true,
            compilerOptions: { noEmit: false },
          },
        },
      },
    ],
  },
  performance: { hints: false },
};
