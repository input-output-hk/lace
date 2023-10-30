module.exports = {
  stories: ['../src/**/*.stories.mdx', '../src/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    'storybook-addon-pseudo-states',
    {
      name: '@storybook/addon-styling',
      options: {
        sass: {
          // Require your Sass preprocessor here
          implementation: require('sass')
        }
      }
    }
  ],
  framework: '@storybook/react',
  webpackFinal: (config) => {
    const fileLoaderRule = config.module.rules.find((rule) => rule.test?.test('.svg'));
    fileLoaderRule.exclude = /\.svg$/;

    config.module.rules.push({
      test: /\.svg$/i,
      issuer: /\.[jt]sx?$/,
      use: [
        {
          loader: '@svgr/webpack',
          options: {
            icon: true,
            exportType: 'named'
          }
        }
      ]
    });

    config.resolve.extensions.push('.svg');

    return config;
  },
  core: {
    builder: 'webpack5',
    options: {
      lazyCompilation: true,
      fsCache: true
    }
  },
  features: {
    interactionsDebugger: true
  }
};
