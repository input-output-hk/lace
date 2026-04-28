import { serializeError as serializeToErrorObject } from 'serialize-error';

export type { ErrorObject } from 'serialize-error';

export const serializeError = (maybeError: unknown) => {
  return serializeToErrorObject(
    maybeError instanceof Error
      ? maybeError
      : new Error(
          typeof maybeError === 'string' ? maybeError : 'Unknown error',
        ),
  );
};
