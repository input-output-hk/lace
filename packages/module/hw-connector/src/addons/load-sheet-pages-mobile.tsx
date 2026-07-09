import { SheetRoutes, SheetStack } from '@lace-lib/navigation';
import React from 'react';

import {
  HardwareWalletDiscoveryError,
  HardwareWalletDiscoveryResults,
} from '../pages/hardware-wallet-discovery';

const loadSheetPagesMobile = () => (
  <React.Fragment key="hw-connector-mobile-sheet-pages">
    <SheetStack.Screen
      name={SheetRoutes.HardwareWalletDiscoveryResults}
      component={HardwareWalletDiscoveryResults}
    />
    <SheetStack.Screen
      name={SheetRoutes.HardwareWalletDiscoveryError}
      component={HardwareWalletDiscoveryError}
    />
  </React.Fragment>
);

export default loadSheetPagesMobile;
