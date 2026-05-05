import { AuthPromptUI } from '@lace-contract/authentication-prompt';
import { ThemeProvider } from '@lace-lib/ui-toolkit';
import React from 'react';
import { Appearance, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

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
 * NativeSafeAreaProvider.web only forwards `style` to its inner View — not the
 * pointerEvents prop — so the provider root defaulted to capturing all touches.
 * pointerEvents must be set via style so Sign Tx stays scrollable/tappable below.
 */
const authPromptSafeAreaProviderStyle = StyleSheet.create({
  fillPassThrough: {
    flex: 1,
    pointerEvents: 'box-none',
  },
});

/**
 * Wrapper component providing ThemeProvider context for authentication prompt UI.
 * Required because popupWindow views only receive LaceUiThemeProvider, but auth
 * prompt components need ThemeProvider from @lace-lib/ui-toolkit.
 *
 * SafeAreaProvider is needed for components that use useSafeAreaInsets.
 * The container View with absoluteFillObject ensures the auth prompt overlay
 * covers the entire popup window.
 */
const AuthPromptUIWithTheme = () => (
  <View style={authPromptRootStyles.root}>
    <SafeAreaProvider style={authPromptSafeAreaProviderStyle.fillPassThrough}>
      <ThemeProvider defaultTheme={Appearance.getColorScheme() || 'dark'}>
        <View style={authPromptContainerStyles.container}>
          <AuthPromptUI />
        </View>
      </ThemeProvider>
    </SafeAreaProvider>
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
 * Wrapper providing SafeAreaProvider, ThemeProvider and BaseTemplate for dApp
 * connector views (Connect, SignTx). Required for React Native components in the
 * browser extension popup.
 */
const DappViewWithTheme = ({ children }: { children: React.ReactNode }) => (
  <SafeAreaProvider>
    <ThemeProvider defaultTheme={Appearance.getColorScheme() || 'dark'}>
      <View style={dappViewWrapperStyles.container}>{children}</View>
    </ThemeProvider>
  </SafeAreaProvider>
);

const CardanoDappConnectWithTheme = () => (
  <DappViewWithTheme>
    <CardanoDappConnectPopup />
  </DappViewWithTheme>
);

const CardanoDappSignTxWithTheme = () => (
  <DappViewWithTheme>
    <CardanoDappSignTxPopup />
  </DappViewWithTheme>
);

const CardanoDappSignDataWithTheme = () => (
  <DappViewWithTheme>
    <CardanoDappSignDataPopup />
  </DappViewWithTheme>
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
      Component: AuthPromptUIWithTheme,
    },
  ];
};

export default renderMap;
