import type { PropsWithChildren } from 'react';
import React, { useMemo } from 'react';

import { Provider } from './context';

import type { DappOutsideHandlesContextValue } from './types';

type OutsideHandlesProviderProps =
  PropsWithChildren<DappOutsideHandlesContextValue>;

export const OutsideHandlesProvider = ({
  children,
  ...props
}: Readonly<OutsideHandlesProviderProps>): React.ReactElement => {
  const contextValue = useMemo<DappOutsideHandlesContextValue>(
    () => props,
    Object.values(props),
  );
  return <Provider value={contextValue}>{children}</Provider>;
};
