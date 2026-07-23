module.exports = api => {
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
          },
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};
