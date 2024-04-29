import { useCallback, useEffect } from 'react';

export type KeyCode = 'Escape' | 'Enter' | 'Space' | 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight' | 'Tab';

type Callback = (event: KeyboardEvent) => void;

type Api1 = [KeyCode[], Callback, boolean?];
type Api2 = [Callback, boolean?];

type UseKeyboardShortcut = {
  (...params: Api1): void;
  (...params: Api2): void;
};

const isApi1 = (params: Api1 | Api2): params is Api1 => Array.isArray(params[0]);
const isApi2 = (params: Api1 | Api2): params is Api2 => typeof params[0] === 'function';

const parseParams = (params: Api1 | Api2) => {
  if (isApi1(params)) {
    const [keyCodes, callback, active] = params;
    return { keyCodes, callback, active };
  }
  if (isApi2(params)) {
    const [callback, active] = params;
    return { keyCodes: [], callback, active };
  }

  throw new Error('Invalid useKeyboardShortcut parameters');
};

export const useKeyboardShortcut: UseKeyboardShortcut = (...params: Api1 | Api2): void => {
  const { active = true, callback, keyCodes } = parseParams(params);
  const handler = useCallback(
    (event: KeyboardEvent) => {
      const executeCallback = keyCodes.length === 0 || keyCodes.includes(event.code as string as KeyCode);
      if (executeCallback) {
        callback(event);
      }
    },
    [callback, keyCodes]
  );

  useEffect(() => {
    if (active) {
      document.addEventListener('keydown', handler);
    }
    return () => {
      document.removeEventListener('keydown', handler);
    };
  }, [handler, active]);
};
