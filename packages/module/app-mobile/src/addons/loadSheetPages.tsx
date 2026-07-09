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
  PortfolioTokenSortSheet,
} from '../pages';

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
        options={{ detents: [1], scrollable: true }}
      />
      <SheetStack.Screen name={SheetRoutes.EditFolder} component={EditFolder} />
      <SheetStack.Screen
        name={SheetRoutes.CreateFolder}
        component={CreateFolder}
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
        options={{
          detents: [1],
          scrollable: true,
        }}
      />
      <SheetStack.Screen
        name={SheetRoutes.AssetDetailBottomSheet}
        component={AssetDetailBottomSheet}
        options={{
          detents: [1],
          scrollable: true,
        }}
      />
      <SheetStack.Screen
        name={SheetRoutes.PortfolioTokenSortControls}
        component={PortfolioTokenSortSheet}
        options={{ stackBehavior: 'push' }}
      />
      <SheetStack.Screen
        name={SheetRoutes.ActivityDetail}
        component={ActivityDetailsSheet}
      />
      <SheetStack.Screen
        name={SheetRoutes.Receive}
        component={ReceiveSheet}
        options={{
          detents: [1],
          scrollable: true,
        }}
      />
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
