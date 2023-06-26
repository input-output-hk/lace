const ADA_HANDLE_PREFIX = '$';
const ADA_HANDLE_THRESHOLD = 2;

export const isHandle = (value: string): boolean =>
  value && value.charAt(0) === ADA_HANDLE_PREFIX && value.length > ADA_HANDLE_THRESHOLD;
