import { SheetRoutes, SheetStack } from '@lace-lib/navigation';
import React from 'react';

import {
  RecoveryPhrase,
  RecoveryPhraseVerification,
  SuccessRecoveryPhraseVerification,
} from '../pages';

import type { AvailableAddons } from '..';
import type { ContextualLaceInit } from '@lace-contract/module';

const sheetPages: ContextualLaceInit<React.ReactNode, AvailableAddons> = () => (
  <React.Fragment key="vault-in-memory-ui-sheet-pages-addons">
    <SheetStack.Screen
      name={SheetRoutes.RecoveryPhrase}
      component={RecoveryPhrase}
    />
    <SheetStack.Screen
      name={SheetRoutes.RecoveryPhraseVerification}
      component={RecoveryPhraseVerification}
    />
    <SheetStack.Screen
      name={SheetRoutes.SuccessRecoveryPhraseVerification}
      component={SuccessRecoveryPhraseVerification}
    />
  </React.Fragment>
);

export default sheetPages;
