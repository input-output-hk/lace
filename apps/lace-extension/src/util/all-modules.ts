import { isNotNil } from '@cardano-sdk/util';
import { loadCreateFeatureFlagStorage } from '@lace-contract/feature';
import {
  getServiceWorkerPreloadAddons,
  preloadModuleAddons,
  reduceMixinsModule,
} from '@lace-contract/module';
import accountManagement from '@lace-module/account-management';
import adaHandle from '@lace-module/ada-handle';
import addressBook from '@lace-module/address-book';
import analyticsDev from '@lace-module/analytics-dev';
import analyticsPosthog from '@lace-module/analytics-posthog';
import appActivityWeb from '@lace-module/app-activity-web';
import appLock from '@lace-module/app-lock';
import appMobile from '@lace-module/app-mobile';
import authenticationPromptUiV2Extension from '@lace-module/authentication-prompt-ui-v2-extension';
import bitcoinMempoolFeeMarket from '@lace-module/bitcoin-mempool-fee-market';
import maestro from '@lace-module/bitcoin-provider-maestro';
import blockchainBitcoin from '@lace-module/blockchain-bitcoin';
import blockchainBitcoinUI from '@lace-module/blockchain-bitcoin-ui';
import blockchainCardano from '@lace-module/blockchain-cardano';
import blockchainCardanoUI from '@lace-module/blockchain-cardano-ui';
import blockchainMidnight from '@lace-module/blockchain-midnight';
import cardanoCollateralFlow from '@lace-module/cardano-collateral-flow';
import blockfrostProvider from '@lace-module/cardano-provider-blockfrost';
import cryptoCardanoSdk from '@lace-module/crypto-cardano-sdk';
import dappConnectorCardano from '@lace-module/dapp-connector-cardano';
import dappConnectorExtension from '@lace-module/dapp-connector-extension';
import dappConnectorMidnight from '@lace-module/dapp-connector-midnight';
import dappExplorer from '@lace-module/dapp-explorer';
import featureDev from '@lace-module/feature-dev';
import featurePosthog from '@lace-module/feature-posthog';
import i18n from '@lace-module/i18n';
import identityCenter from '@lace-module/identity-center';
import migrateMultiDelegation from '@lace-module/migrate-multi-delegation';
import migrateV1Data from '@lace-module/migrate-v1-data';
import notificationCenter from '@lace-module/notification-center';
import onboarding from '@lace-module/onboarding';
import posthogExtension from '@lace-module/posthog-client-extension';
import recoveryPhraseChannelExtension from '@lace-module/recovery-phrase-channel-extension';
import secureStore from '@lace-module/secure-store-extension';
import sendFlow from '@lace-module/send-flow';
import stakingCenter from '@lace-module/staking-center';
import storageExtension, {
  loadCreateDocumentStorage,
} from '@lace-module/storage-extension';
import swapCenter from '@lace-module/swap-center';
import swapProviderSteelswap from '@lace-module/swap-provider-steelswap';
import testApi from '@lace-module/test-api';
import tokenPricingCoinGecko from '@lace-module/token-pricing-coingecko';
import vaultInMemory from '@lace-module/vault-in-memory';
import vaultInMemoryUI from '@lace-module/vault-in-memory-ui';
import vaultLedger from '@lace-module/vault-ledger';
import vaultTrezor from '@lace-module/vault-trezor';
import views from '@lace-module/views-extension';

import type { LaceModule } from '@lace-contract/module';

// Note: Module order matters for tab page ordering.
// e.g: appMobile must come before addressBook so main tabs (Portfolio, Rewards, DApps, Settings)
// are registered first (indices 0-3), and Contacts appears in the secondary menu (index 4+).
export const allModules: LaceModule[] = [
  bitcoinMempoolFeeMarket,
  maestro,
  analyticsDev,
  analyticsPosthog,
  appMobile,
  stakingCenter,
  identityCenter,
  addressBook,
  authenticationPromptUiV2Extension,
  blockchainCardano,
  cardanoCollateralFlow,
  blockchainBitcoin,
  blockfrostProvider,
  cryptoCardanoSdk,
  dappConnectorCardano,
  dappConnectorExtension,
  dappExplorer,
  featureDev,
  featurePosthog,
  i18n,
  notificationCenter,
  onboarding,
  posthogExtension,
  secureStore,
  sendFlow,
  storageExtension,
  testApi,
  tokenPricingCoinGecko,
  appLock,
  appActivityWeb,
  vaultInMemory,
  vaultInMemoryUI,
  vaultLedger,
  vaultTrezor,
  views,
  accountManagement,
  blockchainBitcoinUI,
  blockchainCardanoUI,
  blockchainMidnight,
  dappConnectorMidnight,
  adaHandle,
  swapCenter,
  swapProviderSteelswap,
  migrateMultiDelegation,
  recoveryPhraseChannelExtension,
  // keep this last to overwrite preloadedState
  migrateV1Data,
]
  .map(
    (module): LaceModule | undefined =>
      (module as Partial<Record<'lace-extension', LaceModule>>)[
        'lace-extension'
      ],
  )
  .filter(isNotNil);

const allModulesAndMixins = [reduceMixinsModule(allModules), ...allModules];

// Automatically discover which addons need to be preloaded in the service worker
// based on the `preloadInServiceWorker: true` flag in their contracts.
const swPreloadAddons = getServiceWorkerPreloadAddons(allModules);

// loadStore and loadInitializeAppContext returns LaceInit functions,
// so there is no harm of importing those scripts of all modules.
export const preloadScripts = async () =>
  Promise.all([
    loadCreateFeatureFlagStorage(),
    loadCreateDocumentStorage(),
    ...allModulesAndMixins.map(async module =>
      Promise.all([
        module.store?.load(),
        ...preloadModuleAddons(module, swPreloadAddons),
      ]),
    ),
  ]);
