import type { PropsWithChildren } from 'react';
import React, { useMemo } from 'react';

import { Provider } from './context';

import type { CommonOutsideHandlesContextValue } from './types';

type OutsideHandlesProviderProps =
  PropsWithChildren<CommonOutsideHandlesContextValue>;

export const OutsideHandlesProvider = ({
  children,
  ...props
}: Readonly<OutsideHandlesProviderProps>): React.ReactElement => {
  const contextValue = useMemo<CommonOutsideHandlesContextValue>(
    () => props,
    Object.values(props),
  );
  return <Provider value={contextValue}>{children}</Provider>;
};
