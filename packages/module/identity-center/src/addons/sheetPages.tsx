import { SheetRoutes, SheetStack } from '@lace-lib/navigation';
import React from 'react';

import {
  KYCDetailsPage,
  KYCWebviewPage,
  ConnectionPendingPage,
  ConnectionDetailsPage,
  ConnectionCompletePage,
} from '../pages';

import type { AvailableAddons } from '..';
import type { ContextualLaceInit } from '@lace-contract/module';

const sheetPages: ContextualLaceInit<React.ReactNode, AvailableAddons> = () => (
  <React.Fragment key="identity-center-sheet-pages-addons">
    <SheetStack.Screen
      name={SheetRoutes.ConnectionPending}
      component={ConnectionPendingPage}
    />
    <SheetStack.Screen
      name={SheetRoutes.ConnectionDetails}
      component={ConnectionDetailsPage}
    />
    <SheetStack.Screen
      name={SheetRoutes.ConnectionComplete}
      component={ConnectionCompletePage}
    />
    <SheetStack.Screen
      name={SheetRoutes.KYCDetails}
      component={KYCDetailsPage}
    />
    <SheetStack.Screen
      name={SheetRoutes.KYCWebview}
      component={KYCWebviewPage}
    />
  </React.Fragment>
);

export default sheetPages;
