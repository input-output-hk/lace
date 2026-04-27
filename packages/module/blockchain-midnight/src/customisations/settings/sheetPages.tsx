import { SheetRoutes, SheetStack } from '@lace-lib/navigation';
import React from 'react';

import { DustDesignationSheet } from '../dust-designation';
import { EditTokenNameSheet } from '../editTokenName';

import { MidnightSettingsSheet } from '.';

import type { AvailableAddons } from '../../index';
import type { ContextualLaceInit } from '@lace-contract/module';

const sheetPages: ContextualLaceInit<React.ReactNode, AvailableAddons> = () => {
  return (
    <React.Fragment key="blockchain-midnight-sheet-pages-addons">
      <SheetStack.Screen
        name={SheetRoutes.MidnightSettings}
        component={MidnightSettingsSheet}
      />
      <SheetStack.Screen
        name={SheetRoutes.EditTokenName}
        component={EditTokenNameSheet}
      />
      <SheetStack.Screen
        name={SheetRoutes.DustDesignation}
        component={DustDesignationSheet}
      />
    </React.Fragment>
  );
};

export default sheetPages;
