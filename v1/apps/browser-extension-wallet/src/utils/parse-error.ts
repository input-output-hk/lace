export const parseError = (maybeError: unknown): Error => {
  if (maybeError instanceof Error) {
    return maybeError;
  }
  const errorMessage = typeof maybeError === 'string' ? maybeError : 'Unknown error';
  return new Error(errorMessage);
};
