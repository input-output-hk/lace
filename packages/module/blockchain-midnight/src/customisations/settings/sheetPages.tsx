import { SheetRoutes, SheetStack } from '@lace-lib/navigation';
import React from 'react';

import { DustDesignationSheet } from '../dust-designation';
import { EditTokenNameSheet } from '../editTokenName';

import { MidnightSettingsSheet } from '.';

import type { AvailableAddons } from '../../index';
import type { ContextualLaceInit } from '@lace-contract/module';

// Registered without options these default to detents:['auto'] and
// scrollable:false, and 'auto' cannot measure a Sheet.Scroll plus a footer set
// via setOptions — so the content was clipped. Match the { detents: [1],
// scrollable: true } every other scrollable sheet uses.
const midnightSheetOptions = { detents: [1], scrollable: true };

const sheetPages: ContextualLaceInit<React.ReactNode, AvailableAddons> = () => {
  return (
    <React.Fragment key="blockchain-midnight-sheet-pages-addons">
      <SheetStack.Screen
        name={SheetRoutes.MidnightSettings}
        component={MidnightSettingsSheet}
        options={midnightSheetOptions}
      />
      <SheetStack.Screen
        name={SheetRoutes.EditTokenName}
        component={EditTokenNameSheet}
        options={midnightSheetOptions}
      />
      <SheetStack.Screen
        name={SheetRoutes.DustDesignation}
        component={DustDesignationSheet}
        options={midnightSheetOptions}
      />
    </React.Fragment>
  );
};

export default sheetPages;
