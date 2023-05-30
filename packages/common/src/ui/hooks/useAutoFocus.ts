import { useEffect } from 'react';

const autoFocusMS = 0;

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
export const useAutoFocus = (inputRef: any, autoFocus?: boolean): void => {
  useEffect(() => {
    if (inputRef?.current && autoFocus) {
      // won't work without setTimeout if is inside the antd drawer
      setTimeout(() => {
        if (!inputRef?.current) return;
        (inputRef.current as HTMLInputElement).focus();
      }, autoFocusMS);
    }
  }, [inputRef, autoFocus]);
};
