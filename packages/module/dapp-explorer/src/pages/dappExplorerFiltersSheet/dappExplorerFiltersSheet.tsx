import { FilterSheet } from '@lace-lib/ui-toolkit';
import React from 'react';

import { useFiltersSheet } from './useFiltersSheet';

export const DappExplorerFilters = () => {
  const sheetProps = useFiltersSheet();
  return <FilterSheet {...sheetProps} />;
};
