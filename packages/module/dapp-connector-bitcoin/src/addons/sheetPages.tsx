import { AuthPromptUI } from '@lace-contract/authentication-prompt';
import { SheetRoutes, SheetStack } from '@lace-lib/navigation';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import {
  BitcoinDappConnectSheet,
  BitcoinDappSignMessageSheet,
  BitcoinDappSignTxSheet,
} from '../views';

import type { AvailableAddons } from '../index';
import type { ContextualLaceInit } from '@lace-contract/module';
import type { SheetScreenProps } from '@lace-lib/navigation';

/**
 * Auth prompt overlay rendered inside the sheet so it appears above the sheet
 * content. Global overlays have a lower stacking order than sheets, so the
 * app-wide prompt would otherwise be hidden behind an open sheet.
 */
const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  authPromptOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 1,
    pointerEvents: 'box-none',
  },
});

const SignMessageWithAuthPrompt = (
  _props: SheetScreenProps<SheetRoutes.BitcoinDappSignMessage>,
) => (
  <View style={styles.wrapper}>
    <BitcoinDappSignMessageSheet />
    <View style={styles.authPromptOverlay}>
      <AuthPromptUI />
    </View>
  </View>
);

const SignTxWithAuthPrompt = (
  _props: SheetScreenProps<SheetRoutes.BitcoinDappSignTx>,
) => (
  <View style={styles.wrapper}>
    <BitcoinDappSignTxSheet />
    <View style={styles.authPromptOverlay}>
      <AuthPromptUI />
    </View>
  </View>
);

const sheetPages: ContextualLaceInit<React.ReactNode, AvailableAddons> = () => {
  return (
    <React.Fragment key="dapp-connector-bitcoin-sheet-pages-addons">
      <SheetStack.Screen
        name={SheetRoutes.BitcoinDappConnect}
        component={BitcoinDappConnectSheet}
        options={{
          detents: [1],
          scrollable: true,
        }}
      />
      <SheetStack.Screen
        name={SheetRoutes.BitcoinDappSignMessage}
        component={SignMessageWithAuthPrompt}
        options={{
          detents: [1],
          scrollable: true,
        }}
      />
      <SheetStack.Screen
        name={SheetRoutes.BitcoinDappSignTx}
        component={SignTxWithAuthPrompt}
        options={{
          detents: [1],
          scrollable: true,
        }}
      />
    </React.Fragment>
  );
};

export default sheetPages;
