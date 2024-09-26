import type { PropsWithChildren } from 'react';
import React, { useMemo } from 'react';

import { Provider } from './context';

import type { OutsideHandlesContextValue } from './types';

type OutsideHandlesProviderProps =
  PropsWithChildren<OutsideHandlesContextValue>;

export const OutsideHandlesProvider = ({
  children,
  ...props
}: Readonly<OutsideHandlesProviderProps>): React.ReactElement => {
  const contextValue = useMemo<OutsideHandlesContextValue>(
    () => props,
    Object.values(props),
  );
  return <Provider value={contextValue}>{children}</Provider>;
};
