const ADA_HANDLE_PREFIX = '$';
const ADA_HANDLE_THRESHOLD = 2;

export const HANDLE_DEBOUNCE_TIME = 1000;
export const isHandle = (value: string): boolean =>
  process.env.USE_ADA_HANDLE === 'true' &&
  value &&
  value.charAt(0) === ADA_HANDLE_PREFIX &&
  value.length > ADA_HANDLE_THRESHOLD;
