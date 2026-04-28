import { SheetRoutes, SheetStack } from '@lace-lib/navigation';
import React from 'react';

import { AddContactSheet, ContactDetailsSheet } from '../pages';

import type { AvailableAddons } from '..';
import type { ContextualLaceInit } from '@lace-contract/module';

const sheetPages: ContextualLaceInit<React.ReactNode, AvailableAddons> = () => (
  <React.Fragment key="address-book-sheet-pages-addons">
    <SheetStack.Screen
      name={SheetRoutes.AddContact}
      component={AddContactSheet}
    />
    <SheetStack.Screen
      name={SheetRoutes.ContactDetails}
      component={ContactDetailsSheet}
    />
  </React.Fragment>
);

export default sheetPages;
