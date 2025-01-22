export const getErrorMessage = (error: unknown): string =>
  error && typeof error.toString === 'function' ? error.toString() : '';
