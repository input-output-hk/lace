export const preview = {
  actions: { argTypesRegex: '^on[A-Z].*' },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },
  parameters: {
    // Notifies Chromatic to pause the animations when they finish for all stories.
    chromatic: { pauseAnimationAtEnd: true },
  },
};
