import { InputRef } from 'antd';
import { RefObject, useEffect } from 'react';

const AUTO_FOCUS_MS = 0;

export const useAutoFocus = <T extends HTMLInputElement | InputRef>(
  inputRefOrId: RefObject<T> | string,
  autoFocus?: boolean,
  ms = AUTO_FOCUS_MS
): void => {
  useEffect(() => {
    const element =
      typeof inputRefOrId === 'string'
        ? document.querySelector<HTMLInputElement>(`#${inputRefOrId}`)
        : inputRefOrId.current;

    if (!element || !autoFocus) return;

    // won't work without setTimeout if is inside the antd drawer
    setTimeout(() => {
      if (typeof element !== 'object') return;
      element.focus();
    }, ms);
  }, [inputRefOrId, autoFocus, ms]);
};
