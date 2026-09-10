import { AuthPromptUI } from '@lace-contract/authentication-prompt';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import {
  BITCOIN_DAPP_CONNECT_LOCATION,
  BITCOIN_DAPP_SIGN_MESSAGE_LOCATION,
  BITCOIN_DAPP_SIGN_TX_LOCATION,
} from '../const';
import {
  BitcoinDappConnectPopup,
  BitcoinDappSignMessagePopup,
  BitcoinDappSignTxPopup,
} from '../views';

import type { AvailableAddons } from '../index';
import type { ContextualLaceInit } from '@lace-contract/module';
import type { Render } from '@lace-contract/views';

/**
 * Regex pattern matching routes where the authentication prompt should be
 * displayed, so the app-wide lock screen overlay appears on both dApp
 * signing popups when the wallet is locked.
 */
const authPromptRoutesPattern = new RegExp(
  `/?(?:${BITCOIN_DAPP_CONNECT_LOCATION.slice(
    1,
  )}|${BITCOIN_DAPP_SIGN_MESSAGE_LOCATION.slice(
    1,
  )}|${BITCOIN_DAPP_SIGN_TX_LOCATION.slice(1)})`,
);

const authPromptContainerStyles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    zIndex: 1,
    pointerEvents: 'box-none',
  },
});

const authPromptRootStyles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    zIndex: 1,
    pointerEvents: 'box-none',
  },
});

/**
 * Auth prompt overlay container.
 * Theme/SafeArea providers are supplied by `App.tsx`'s popup branch so they
 * follow the user's theme preference instead of the OS preference.
 */
const AuthPromptUIWithOverlay = () => (
  <View style={authPromptRootStyles.root}>
    <View style={authPromptContainerStyles.container}>
      <AuthPromptUI />
    </View>
  </View>
);

const dappViewWrapperStyles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    alignSelf: 'stretch',
    minWidth: '100%',
  },
});

/**
 * Layout wrapper for dApp connector views. Theme/SafeArea providers are
 * supplied by `App.tsx`'s popup branch.
 */
const BitcoinDappConnectorView = ({
  children,
}: {
  children: React.ReactNode;
}) => <View style={dappViewWrapperStyles.container}>{children}</View>;

const BitcoinDappConnectWithTheme = () => (
  <BitcoinDappConnectorView>
    <BitcoinDappConnectPopup />
  </BitcoinDappConnectorView>
);

const BitcoinDappSignMessageWithTheme = () => (
  <BitcoinDappConnectorView>
    <BitcoinDappSignMessagePopup />
  </BitcoinDappConnectorView>
);

const BitcoinDappSignTxWithTheme = () => (
  <BitcoinDappConnectorView>
    <BitcoinDappSignTxPopup />
  </BitcoinDappConnectorView>
);

/**
 * Extension popup route configuration for the Bitcoin dApp connector views.
 *
 * - BITCOIN_DAPP_CONNECT_LOCATION: connect/authorize review
 * - BITCOIN_DAPP_SIGN_MESSAGE_LOCATION: signMessage review
 * - BITCOIN_DAPP_SIGN_TX_LOCATION: signPsbt review
 * - authPromptRoutesPattern: auth prompt overlay for all, requiring the
 *   wallet to be unlocked before the request can be reviewed
 */
const renderMap: ContextualLaceInit<Render[], AvailableAddons> = () => {
  return [
    {
      locationPattern: new RegExp(
        `/?${BITCOIN_DAPP_CONNECT_LOCATION.slice(1)}`,
      ),
      key: BITCOIN_DAPP_CONNECT_LOCATION,
      Component: BitcoinDappConnectWithTheme,
    },
    {
      locationPattern: new RegExp(
        `/?${BITCOIN_DAPP_SIGN_MESSAGE_LOCATION.slice(1)}`,
      ),
      key: BITCOIN_DAPP_SIGN_MESSAGE_LOCATION,
      Component: BitcoinDappSignMessageWithTheme,
    },
    {
      locationPattern: new RegExp(
        `/?${BITCOIN_DAPP_SIGN_TX_LOCATION.slice(1)}`,
      ),
      key: BITCOIN_DAPP_SIGN_TX_LOCATION,
      Component: BitcoinDappSignTxWithTheme,
    },
    {
      locationPattern: authPromptRoutesPattern,
      key: 'bitcoin-dapp-auth-prompt',
      Component: AuthPromptUIWithOverlay,
    },
  ];
};

export default renderMap;
