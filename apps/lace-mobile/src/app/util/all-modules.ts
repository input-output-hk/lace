import { isNotNil } from '@cardano-sdk/util';
import accountManagement from '@lace-module/account-management';
import adaHandle from '@lace-module/ada-handle';
import addressBook from '@lace-module/address-book';
import analyticsDev from '@lace-module/analytics-dev';
import analyticsPosthog from '@lace-module/analytics-posthog';
import appActivityMobile from '@lace-module/app-activity-mobile';
import appLock from '@lace-module/app-lock';
import appMobile from '@lace-module/app-mobile';
import authenticationPromptUiV2Extension from '@lace-module/authentication-prompt-ui-v2-extension';
import bitcoinFeeMarket from '@lace-module/bitcoin-mempool-fee-market';
import bitcoinProvider from '@lace-module/bitcoin-provider-maestro';
import blockchainBitcoin from '@lace-module/blockchain-bitcoin';
import blockchainBitcoinUi from '@lace-module/blockchain-bitcoin-ui';
import blockchainCardano from '@lace-module/blockchain-cardano';
import blockchainCardanoUi from '@lace-module/blockchain-cardano-ui';
import cardanoCollateralFlow from '@lace-module/cardano-collateral-flow';
import blockfrostProvider from '@lace-module/cardano-provider-blockfrost';
import claimModule from '@lace-module/cardano-uri-linking';
import cryptoApollo from '@lace-module/crypto-apollo';
import dappConnectorCardano from '@lace-module/dapp-connector-cardano';
import dappExplorer from '@lace-module/dapp-explorer';
import featureDev from '@lace-module/feature-dev';
import featurePosthog from '@lace-module/feature-posthog';
import i18n from '@lace-module/i18n';
import identityCenter from '@lace-module/identity-center';
import migrateMultiDelegation from '@lace-module/migrate-multi-delegation';
import notificationCenter from '@lace-module/notification-center';
import onboarding from '@lace-module/onboarding';
import posthogClientReactNative from '@lace-module/posthog-client-react-native';
import secureStore from '@lace-module/secure-store-mobile';
import sendFlow from '@lace-module/send-flow';
import stakingCenter from '@lace-module/staking-center';
import storage from '@lace-module/storage-react-native-async';
import swapCenter from '@lace-module/swap-center';
import swapProviderSteelswap from '@lace-module/swap-provider-steelswap';
import testApi from '@lace-module/test-api';
import tokenPricingCoinGecko from '@lace-module/token-pricing-coingecko';
import vaultInMemory from '@lace-module/vault-in-memory';
import vaultInMemoryUI from '@lace-module/vault-in-memory-ui';
import viewsMobile from '@lace-module/views-mobile';

export const allModules = [
  analyticsDev,
  analyticsPosthog,
  appMobile,
  stakingCenter,
  identityCenter,
  addressBook,
  authenticationPromptUiV2Extension,
  blockchainCardano,
  cardanoCollateralFlow,
  blockchainCardanoUi,
  blockchainBitcoinUi,
  // TODO: resolve LW-12651 before uncommenting
  //blockchainMidnight,
  bitcoinProvider,
  bitcoinFeeMarket,
  blockchainBitcoin,
  accountManagement,
  blockfrostProvider,
  cryptoApollo,
  dappExplorer,
  featureDev,
  claimModule,
  featurePosthog,
  i18n,
  onboarding,
  notificationCenter,
  posthogClientReactNative,
  secureStore,
  sendFlow,
  storage,
  testApi,
  tokenPricingCoinGecko,
  appLock,
  appActivityMobile,
  vaultInMemory,
  vaultInMemoryUI,
  viewsMobile,
  dappConnectorCardano,
  adaHandle,
  migrateMultiDelegation,
  swapCenter,
  swapProviderSteelswap,
]
  .map(m => m['lace-mobile'])
  .filter(isNotNil);
