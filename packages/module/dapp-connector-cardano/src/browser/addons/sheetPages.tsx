import { AuthPromptUI } from '@lace-contract/authentication-prompt';
import { SheetRoutes, SheetStack } from '@lace-lib/navigation';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import {
  CardanoDappConnect,
  CardanoDappSignData,
  CardanoDappSignTx,
} from '../../browser/views';

import type { AvailableAddons } from '../..';
import type { ContextualLaceInit } from '@lace-contract/module';
import type { SheetScreenProps } from '@lace-lib/navigation';

/**
 * Auth prompt overlay rendered inside the sheet so it appears above the sheet
 * content. Global overlays have z-index 1 while sheets have z-index 10, so the
 * global auth prompt overlay is hidden behind an open sheet. By rendering
 * AuthPromptUI here, the prompt lives within the sheet's stacking context.
 */
const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  authPromptOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
    pointerEvents: 'box-none',
  },
});

const SignTxWithAuthPrompt = (_props: SheetScreenProps<SheetRoutes.SignTx>) => (
  <View style={styles.wrapper}>
    <CardanoDappSignTx />
    <View style={styles.authPromptOverlay}>
      <AuthPromptUI />
    </View>
  </View>
);

const SignDataWithAuthPrompt = (
  _props: SheetScreenProps<SheetRoutes.SignData>,
) => (
  <View style={styles.wrapper}>
    <CardanoDappSignData />
    <View style={styles.authPromptOverlay}>
      <AuthPromptUI />
    </View>
  </View>
);

const sheetPages: ContextualLaceInit<React.ReactNode, AvailableAddons> = () => {
  return (
    <React.Fragment key="dapp-connector-cardano-browser-sheet-pages-addons">
      <SheetStack.Screen
        name={SheetRoutes.AuthorizeDapp}
        component={CardanoDappConnect}
      />
      <SheetStack.Screen
        name={SheetRoutes.SignData}
        component={SignDataWithAuthPrompt}
      />
      <SheetStack.Screen
        name={SheetRoutes.SignTx}
        component={SignTxWithAuthPrompt}
      />
    </React.Fragment>
  );
};

export default sheetPages;
