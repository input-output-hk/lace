import { SheetRoutes, SheetStack } from '@lace-lib/navigation';
import React from 'react';

import {
  ActivityDetailsSheet,
  AssetDetailBottomSheet,
  AuthorizedDAppsSheet,
  BuySheet,
  CreateFolder,
  EditFolder,
  ThemeSelection,
  LanguageSheet,
  NetworkSheet,
  ReceiveSheet,
  FiatCurrencySheet,
  ComingSoonSheet,
  EditWalletSheet,
} from '../pages';
import {
  HardwareWalletDiscoverySearching,
  HardwareWalletDiscoveryError,
  HardwareWalletDiscoveryResults,
} from '../pages/hardware-wallet-discovery';

import type { AvailableAddons } from '..';
import type { ContextualLaceInit } from '@lace-contract/module';

const loadSheetPages: ContextualLaceInit<
  React.ReactNode,
  AvailableAddons
> = () => {
  return (
    <React.Fragment key="app-mobile-sheet-pages-addons">
      <SheetStack.Screen
        name={SheetRoutes.AuthorizedDApps}
        component={AuthorizedDAppsSheet}
      />
      <SheetStack.Screen name={SheetRoutes.EditFolder} component={EditFolder} />
      <SheetStack.Screen
        name={SheetRoutes.CreateFolder}
        component={CreateFolder}
      />
      <SheetStack.Screen
        name={SheetRoutes.HardwareWalletDiscoverySearching}
        component={HardwareWalletDiscoverySearching}
      />
      <SheetStack.Screen
        name={SheetRoutes.HardwareWalletDiscoveryError}
        component={HardwareWalletDiscoveryError}
      />
      <SheetStack.Screen
        name={SheetRoutes.HardwareWalletDiscoveryResults}
        component={HardwareWalletDiscoveryResults}
      />
      <SheetStack.Screen name={SheetRoutes.Buy} component={BuySheet} />
      <SheetStack.Screen
        name={SheetRoutes.ThemeSelection}
        component={ThemeSelection}
      />
      <SheetStack.Screen
        name={SheetRoutes.Language}
        component={LanguageSheet}
      />
      <SheetStack.Screen
        name={SheetRoutes.NetworkSelection}
        component={NetworkSheet}
      />
      <SheetStack.Screen
        name={SheetRoutes.FiatCurrencySheet}
        component={FiatCurrencySheet}
      />
      <SheetStack.Screen
        name={SheetRoutes.AssetDetailBottomSheet}
        component={AssetDetailBottomSheet}
      />
      <SheetStack.Screen
        name={SheetRoutes.ActivityDetail}
        component={ActivityDetailsSheet}
      />
      <SheetStack.Screen name={SheetRoutes.Receive} component={ReceiveSheet} />
      <SheetStack.Screen
        name={SheetRoutes.ComingSoon}
        component={ComingSoonSheet}
      />
      <SheetStack.Screen
        name={SheetRoutes.EditWallet}
        component={EditWalletSheet}
      />
    </React.Fragment>
  );
};

export default loadSheetPages;
