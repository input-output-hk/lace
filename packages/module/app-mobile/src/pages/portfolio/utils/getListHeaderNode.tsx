import React from 'react';

import type { ListHeaderComponentProperty } from '../types';

export const getListHeaderNode = <T,>(
  ListHeaderComponent?: ListHeaderComponentProperty<T>,
): React.ReactElement | null => {
  if (!ListHeaderComponent) return null;
  if (typeof ListHeaderComponent === 'function') {
    const Header = ListHeaderComponent as React.ComponentType<unknown>;
    return <Header />;
  }
  return ListHeaderComponent as React.ReactElement | null;
};
