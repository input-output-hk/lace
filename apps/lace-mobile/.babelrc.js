module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          extensions: ['.tsx', '.ts', '.js', '.json'],
          alias: {
            '@lace-contract': '../../packages/contract',
            '@lace-lib': '../../packages/lib',
            '@lace-module': '../../packages/module',
            '@lace-sdk': '../../packages/sdk',
          },
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};
