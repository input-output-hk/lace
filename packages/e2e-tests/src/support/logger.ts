export const Logger = {
  log: (message: string): void => {
    // eslint-disable-next-line no-console
    console.log(message);
  },

  warn: (message: string): void => {
    console.warn(message);
  },

  error: (message: string): void => {
    console.error(message);
  }
};
