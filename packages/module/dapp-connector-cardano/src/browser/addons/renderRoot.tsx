import { AuthPromptUI } from '@lace-contract/authentication-prompt';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import {
  CARDANO_DAPP_CONNECT_LOCATION,
  CARDANO_DAPP_SIGN_DATA_LOCATION,
  CARDANO_DAPP_SIGN_TX_LOCATION,
} from '../const';
import {
  CardanoDappConnectPopup,
  CardanoDappSignDataPopup,
  CardanoDappSignTxPopup,
} from '../views';

import type { AvailableAddons } from '../..';
import type { ContextualLaceInit } from '@lace-contract/module';
import type { Render } from '@lace-contract/views';

/**
 * Regex pattern matching routes where authentication prompt should be displayed.
 * Matches the dApp connect route and both signing routes so the app-wide lock
 * screen overlay appears on all dApp connector popups when the wallet is locked.
 */
const authPromptRoutesPattern = new RegExp(
  `/?(?:${CARDANO_DAPP_CONNECT_LOCATION.slice(
    1,
  )}|${CARDANO_DAPP_SIGN_TX_LOCATION.slice(
    1,
  )}|${CARDANO_DAPP_SIGN_DATA_LOCATION.slice(1)})`,
);

const authPromptContainerStyles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
    pointerEvents: 'box-none',
  },
});

/**
 * Root is position:absolute so AuthPrompt does not share a flex row with SignTx.
 * LaceRenderRoot renders both routes for the sign-tx URL; otherwise each ~50% width
 * like Connect (single route) vs SignTx (two siblings).
 */
const authPromptRootStyles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
    // RN Web: ensure hit-testing passes through; prop alone is not enough on all views.
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
const CardanoDappConnectView = ({
  children,
}: {
  children: React.ReactNode;
}) => <View style={dappViewWrapperStyles.container}>{children}</View>;

const CardanoDappConnectWithTheme = () => (
  <CardanoDappConnectView>
    <CardanoDappConnectPopup />
  </CardanoDappConnectView>
);

const CardanoDappSignTxWithTheme = () => (
  <CardanoDappConnectView>
    <CardanoDappSignTxPopup />
  </CardanoDappConnectView>
);

const CardanoDappSignDataWithTheme = () => (
  <CardanoDappConnectView>
    <CardanoDappSignDataPopup />
  </CardanoDappConnectView>
);

/**
 * Extension popup route configuration for Cardano dApp connector views.
 *
 * Each route entry maps a URL pattern to a React component:
 * - CARDANO_DAPP_CONNECT_LOCATION: Connection request view for dApp authorization
 * - CARDANO_DAPP_SIGN_TX_LOCATION: Transaction signing confirmation view
 * - CARDANO_DAPP_SIGN_DATA_LOCATION: Data signing confirmation view
 * - signRoutesPattern: Auth prompt overlay for signing routes requiring password
 */
const renderMap: ContextualLaceInit<Render[], AvailableAddons> = () => {
  return [
    {
      locationPattern: new RegExp(
        `/?${CARDANO_DAPP_CONNECT_LOCATION.slice(1)}`,
      ),
      key: CARDANO_DAPP_CONNECT_LOCATION,
      Component: CardanoDappConnectWithTheme,
    },
    {
      locationPattern: new RegExp(
        `/?${CARDANO_DAPP_SIGN_TX_LOCATION.slice(1)}`,
      ),
      key: CARDANO_DAPP_SIGN_TX_LOCATION,
      Component: CardanoDappSignTxWithTheme,
    },
    {
      locationPattern: new RegExp(
        `/?${CARDANO_DAPP_SIGN_DATA_LOCATION.slice(1)}`,
      ),
      key: CARDANO_DAPP_SIGN_DATA_LOCATION,
      Component: CardanoDappSignDataWithTheme,
    },
    {
      locationPattern: authPromptRoutesPattern,
      key: 'cardano-dapp-auth-prompt',
      Component: AuthPromptUIWithOverlay,
    },
  ];
};

export default renderMap;
