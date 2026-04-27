import { AuthPromptUI } from '@lace-contract/authentication-prompt';
import { ThemeProvider } from '@lace-lib/ui-toolkit';
import React from 'react';
import { Appearance, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import {
  MIDNIGHT_AUTHORIZE_DAPP_LOCATION,
  MIDNIGHT_DAPP_AUTH_PROMPT_LOCATION,
  MIDNIGHT_SIGN_DATA_AUTH_PROMPT_LOCATION,
  PROVE_MIDNIGHT_TRANSACTION_LAYOUT,
  SIGN_MIDNIGHT_DATA_LAYOUT,
  WALLET_UNLOCK_LOCATION,
} from '../const';

import { MidnightDappConnectView } from './midnight-dapp-connect';
import { ProveMidnightTransactionV2 } from './prove-midnight-transaction-v2';
import { SignMidnightDataV2 } from './sign-midnight-data-v2';

import type { AvailableAddons } from '..';
import type { ContextualLaceInit } from '@lace-contract/module';
import type { Render } from '@lace-contract/views';

const authPromptContainerStyles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
});

const AuthPromptUIWithTheme = () => (
  <SafeAreaProvider>
    <ThemeProvider defaultTheme={Appearance.getColorScheme() || 'dark'}>
      <View
        style={authPromptContainerStyles.container}
        pointerEvents="box-none">
        <AuthPromptUI />
      </View>
    </ThemeProvider>
  </SafeAreaProvider>
);

const renderMap: ContextualLaceInit<Render[], AvailableAddons> = () => {
  return [
    {
      locationPattern: new RegExp(`/?${MIDNIGHT_AUTHORIZE_DAPP_LOCATION}`),
      key: MIDNIGHT_AUTHORIZE_DAPP_LOCATION,
      Component: MidnightDappConnectView,
    },
    {
      locationPattern: new RegExp(`/?${PROVE_MIDNIGHT_TRANSACTION_LAYOUT}`),
      key: PROVE_MIDNIGHT_TRANSACTION_LAYOUT,
      Component: ProveMidnightTransactionV2,
    },
    {
      locationPattern: new RegExp(`/?${SIGN_MIDNIGHT_DATA_LAYOUT}`),
      key: SIGN_MIDNIGHT_DATA_LAYOUT,
      Component: SignMidnightDataV2,
    },
    {
      locationPattern: new RegExp(`/?${WALLET_UNLOCK_LOCATION}`),
      key: WALLET_UNLOCK_LOCATION,
      Component: () => null,
    },
    {
      locationPattern: new RegExp(
        `/?(?:${MIDNIGHT_AUTHORIZE_DAPP_LOCATION}|${PROVE_MIDNIGHT_TRANSACTION_LAYOUT})`,
      ),
      key: MIDNIGHT_DAPP_AUTH_PROMPT_LOCATION,
      Component: AuthPromptUIWithTheme,
    },
    {
      locationPattern: new RegExp(`/?${SIGN_MIDNIGHT_DATA_LAYOUT}`),
      key: MIDNIGHT_SIGN_DATA_AUTH_PROMPT_LOCATION,
      Component: AuthPromptUIWithTheme,
    },
  ];
};

export default renderMap;
