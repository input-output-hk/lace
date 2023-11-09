const ADA_HANDLE_PREFIX = '$';
const ADA_HANDLE_THRESHOLD = 2;

export const HANDLE_DEBOUNCE_TIME = 700;
export const isHandle = (value: string): boolean =>
  value !== undefined &&
  value.length > 0 &&
  value.charAt(0) === ADA_HANDLE_PREFIX &&
  value.length > ADA_HANDLE_THRESHOLD;
