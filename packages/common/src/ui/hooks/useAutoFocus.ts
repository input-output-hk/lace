import { InputRef } from 'antd';
import { RefObject, useEffect } from 'react';

const autoFocusMS = 0;

export const useAutoFocus = <T extends HTMLInputElement | InputRef>(
  inputRef: RefObject<T> | string,
  autoFocus?: boolean,
  ms = autoFocusMS
): void => {
  useEffect(() => {
    const element =
      typeof inputRef === 'string' ? document.querySelector<HTMLInputElement>(`#${inputRef}`) : inputRef.current;

    if (!element || !autoFocus) return;

    // won't work without setTimeout if is inside the antd drawer
    setTimeout(() => {
      if (typeof element !== 'object') return;
      element.focus();
    }, ms);
  }, [inputRef, autoFocus, ms]);
};
