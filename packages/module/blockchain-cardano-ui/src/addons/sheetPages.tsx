import { SheetRoutes, SheetStack } from '@lace-lib/navigation';
import React from 'react';

import { CnightDesignationSheet, CollateralSheet } from '../pages';

const sheetPages = () => {
  return (
    <React.Fragment key="blockchain-cardano-ui-sheet-pages-addons">
      <SheetStack.Screen
        name={SheetRoutes.Collateral}
        component={CollateralSheet}
      />
      {/* detents [1] + scrollable pins the sheet to full height and gives the
          scroll body a bounded height so the (tall) manage view scrolls; the
          TrueSheet default (auto height, non-scrollable) clips its tail. The
          footer becomes an absolute overlay, hence the scroll content reserves
          its height (see CnightDesignationSheet). Matches the other scrollable
          multi-step sheets (governance-center, dapp-connector). */}
      <SheetStack.Screen
        name={SheetRoutes.CnightDesignation}
        component={CnightDesignationSheet}
        options={{ detents: [1], scrollable: true }}
      />
    </React.Fragment>
  );
};

export default sheetPages;
