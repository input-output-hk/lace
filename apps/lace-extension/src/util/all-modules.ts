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
import airGappedQrExchangeHost from '@lace-module/air-gapped-qr-exchange-host';
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
import cardanoSync from '@lace-module/cardano-sync';
import cryptoCardanoSdk from '@lace-module/crypto-cardano-sdk';
import dappConnectorBitcoin from '@lace-module/dapp-connector-bitcoin';
import dappConnectorCardano from '@lace-module/dapp-connector-cardano';
import dappConnectorExtension from '@lace-module/dapp-connector-extension';
import dappConnectorMidnight from '@lace-module/dapp-connector-midnight';
import dappExplorer from '@lace-module/dapp-explorer';
import earnRewards from '@lace-module/earn-rewards';
import featureDev from '@lace-module/feature-dev';
import featurePosthog from '@lace-module/feature-posthog';
import governanceCenter from '@lace-module/governance-center';
import hwConnector from '@lace-module/hw-connector';
import i18n from '@lace-module/i18n';
import identityCenter from '@lace-module/identity-center';
import midnightSync from '@lace-module/midnight-sync';
import migrateMultiDelegation from '@lace-module/migrate-multi-delegation';
import migrateV1Data from '@lace-module/migrate-v1-data';
import migrateWallet from '@lace-module/migrate-wallet';
import notificationCenter from '@lace-module/notification-center';
import onboarding from '@lace-module/onboarding';
import posthogExtension from '@lace-module/posthog-client-extension';
import realfiCardano from '@lace-module/realfi-cardano';
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
import vaultKeystone from '@lace-module/vault-keystone';
import vaultLedger from '@lace-module/vault-ledger';
import vaultLocal from '@lace-module/vault-local';
import vaultSeedSigner from '@lace-module/vault-seed-signer';
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
  governanceCenter,
  earnRewards,
  identityCenter,
  addressBook,
  authenticationPromptUiV2Extension,
  blockchainCardano,
  cardanoCollateralFlow,
  cardanoSync,
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
  realfiCardano,
  secureStore,
  airGappedQrExchangeHost,
  sendFlow,
  storageExtension,
  testApi,
  tokenPricingCoinGecko,
  appLock,
  appActivityWeb,
  vaultInMemory,
  vaultInMemoryUI,
  vaultLocal,
  vaultLedger,
  vaultTrezor,
  vaultSeedSigner,
  vaultKeystone,
  views,
  accountManagement,
  blockchainBitcoinUI,
  blockchainCardanoUI,
  blockchainMidnight,
  midnightSync,
  dappConnectorMidnight,
  dappConnectorBitcoin,
  adaHandle,
  swapCenter,
  swapProviderSteelswap,
  migrateMultiDelegation,
  migrateWallet,
  recoveryPhraseChannelExtension,
  hwConnector,
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

type PreloadTask = { label: string; run: () => Promise<unknown> };
type PreloadFailure = { label: string; reason: unknown };

/**
 * Every import the service worker must make inside `install`, each labelled with
 * the module and addon it belongs to.
 *
 * loadStore and loadInitializeAppContext return LaceInit functions, so there is
 * no harm in importing those scripts for all modules.
 *
 * Addons are enumerated one per task rather than batched per module: a batch
 * fails under the name of whichever import rejected first, which is exactly the
 * detail needed to act on a failure.
 */
const preloadTasks = (): PreloadTask[] => [
  {
    label: 'bootstrap:createFeatureFlagStorage',
    run: loadCreateFeatureFlagStorage,
  },
  { label: 'bootstrap:createDocumentStorage', run: loadCreateDocumentStorage },
  ...allModulesAndMixins.flatMap((module): PreloadTask[] => [
    ...(module.store === undefined
      ? []
      : [
          {
            label: `store:${module.moduleName}`,
            run: async () => module.store?.load(),
          },
        ]),
    ...swPreloadAddons.map(addonName => ({
      label: `addon:${module.moduleName}.${addonName}`,
      run: async () => Promise.all(preloadModuleAddons(module, [addonName])),
    })),
  ]),
];

/**
 * Preloads every script the service worker needs, and names whatever failed.
 *
 * Chrome MV3 allows `importScripts` only during initial evaluation and the
 * `install` event, and webpack implements a service-worker `import()` as
 * `importScripts` — so a chunk missed here can never be imported again for that
 * profile ([ADR 25](../../../../docs/adr/25-preload-service-worker-addons.md)).
 * The failure surfaces later as an unhandled NetworkError from
 * `__webpack_require__.f.i`, naming only a numeric chunk.
 *
 * Two things this does that a bare `Promise.all` did not:
 *
 * - **Every task is awaited before the install is failed.** `Promise.all`
 *   rejects on the first failure, so `waitUntil` rejected — and Chrome could
 *   tear the worker down — while sibling imports were still in flight.
 * - **Failures are named.** Previously the rejection carried no indication of
 *   which module or addon could not be imported.
 *
 * It still throws when anything failed, so a bad install is still reported to
 * Chrome as a failed install and retried, exactly as before.
 */
export const preloadScripts = async (): Promise<void> => {
  const tasks = preloadTasks();
  const failures: PreloadFailure[] = [];

  await Promise.all(
    tasks.map(async ({ label, run }) => {
      try {
        await run();
      } catch (reason) {
        failures.push({ label, reason });
      }
    }),
  );

  if (failures.length === 0) return;

  // Carried in the thrown error rather than logged: this module is imported by
  // the service worker entry, and `logger` pulls in `config`, which validates
  // the environment at module scope. The throw is already unhandled and
  // reported, so the names travel with it.
  throw new Error(
    `Service worker preload failed for ${failures.length} of ${tasks.length} imports: ` +
      `${failures
        .map(({ label, reason }) => `${label} (${String(reason)})`)
        .join('; ')}. ` +
      'Scripts not imported during install cannot be imported later.',
  );
};
