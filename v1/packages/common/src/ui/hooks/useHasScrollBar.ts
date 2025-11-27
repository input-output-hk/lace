import { useEffect, useMemo } from 'react';

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
export const useHasScrollBar = (inputRef: any, cb: (hasScrollBar: boolean) => void): void => {
  const resizeObserver = useMemo(
    () =>
      new ResizeObserver((entries: ResizeObserverEntry[]) => {
        for (const entry of entries) {
          cb(entry.target.scrollHeight > entry.target.clientHeight);
        }
      }),
    [cb]
  );

  if (inputRef?.current) {
    resizeObserver.observe(inputRef.current);
  }

  useEffect(() => {
    const target = inputRef?.current;

    if (target) {
      resizeObserver.observe(target);
    }
    return () => {
      if (target) {
        resizeObserver.unobserve(target);
      }
    };
  }, [inputRef, resizeObserver]);
};
