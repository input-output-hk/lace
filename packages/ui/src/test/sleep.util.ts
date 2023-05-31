export const sleep = async (ms = 1000): Promise<void> =>
  new Promise(resolve =>
    setTimeout(resolve, process.env.STORYBOOK_TEST ?? '' ? 0 : ms),
  );
