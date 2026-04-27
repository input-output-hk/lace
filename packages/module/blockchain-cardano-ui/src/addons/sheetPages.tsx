import { SheetRoutes, SheetStack } from '@lace-lib/navigation';
import React from 'react';

import { CollateralSheet } from '../pages';

const sheetPages = () => {
  return (
    <React.Fragment key="blockchain-cardano-ui-sheet-pages-addons">
      <SheetStack.Screen
        name={SheetRoutes.Collateral}
        component={CollateralSheet}
      />
    </React.Fragment>
  );
};

export default sheetPages;
