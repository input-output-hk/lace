import { useState, useEffect } from 'react';

export const useControlledState = <T>(
  controlledValue: T | undefined,
  defaultValue: T,
): [T, (value: T) => void] => {
  const [state, setState] = useState<T>(controlledValue ?? defaultValue);

  useEffect(() => {
    if (controlledValue !== undefined) setState(controlledValue);
  }, [controlledValue]);

  return [state, setState];
};
