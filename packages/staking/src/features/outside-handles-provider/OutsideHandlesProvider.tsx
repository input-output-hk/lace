import { PropsWithChildren, useMemo } from 'react';
import { Provider } from './context';
import { OutsideHandlesContextValue } from './types';

export type OutsideHandlesProviderProps = PropsWithChildren<OutsideHandlesContextValue>;

export const OutsideHandlesProvider = ({ children, ...props }: OutsideHandlesProviderProps) => {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const contextValue = useMemo<OutsideHandlesContextValue>(() => props, Object.values(props));
  return <Provider value={contextValue}>{children}</Provider>;
};
