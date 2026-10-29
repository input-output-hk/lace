import { TimeoutError } from '../errors';

export const promiseTimeout = <T>(promise: Promise<T>, timeout: number) => {
  // The timer handle's type differs between the Node and DOM libraries, and
  // consumers compile this source under both.
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  return Promise.race([
    promise,
    new Promise<T>(
      (_, reject) =>
        (timeoutId = setTimeout(
          () =>
            reject(new TimeoutError('Failed to resolve the promise in time')),
          timeout,
        )),
    ),
  ]).finally(() => {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  });
};
