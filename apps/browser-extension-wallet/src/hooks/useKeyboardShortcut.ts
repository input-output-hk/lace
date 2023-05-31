import { useCallback, useEffect } from 'react';
import { KeyCode } from '@types';

export const useKeyboardShortcut = (keyCodes: KeyCode[], callback: () => void, active = true): void => {
  const handler = useCallback(
    ({ code }: KeyboardEvent) => {
      if (keyCodes.includes(code as string as KeyCode)) {
        callback();
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
