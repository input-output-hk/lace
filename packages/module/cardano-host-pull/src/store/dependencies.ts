import { Cardano, ProviderError, ProviderFailure } from '@cardano-sdk/core';
import {
  cardanoNetworkMagicToNetworkType,
  getAdaTokenTickerByNetwork,
  LOVELACE_TOKEN_ID,
} from '@lace-contract/cardano-context';
import {
  BlockfrostActivityProvider,
  BlockfrostAssetProvider,
  BlockfrostDelegationsProvider,
  BlockfrostGovernanceProvider,
  BlockfrostInputResolverProvider,
  BlockfrostNetworkInfoProvider,
  BlockfrostRegistrationsProvider,
  BlockfrostRewardsProvider,
  BlockfrostStakePoolProvider,
  BlockfrostTokensProvider,
  BlockfrostUtxoProvider,
  BlockfrostWithdrawalsProvider,
  computeBlockfrostConfigIdentifier,
  getBlockfrostClient,
  LOVELACE_METADATA,
  toContractTokenMetadata,
} from '@lace-lib/cardano-provider-core';
import { hasLaceCapability } from '@lace-lib/extension-shell-client';
import { Blockchains } from '@lace-lib/ui-toolkit/src/design-system/atoms/icons/urls';
import { Err, Ok } from '@lace-lib/util';
import memoize from 'lodash/memoize';
import {
  combineLatest,
  debounceTime,
  filter,
  from,
  fromEvent,
  map,
  merge,
  NEVER,
  of,
  switchMap,
} from 'rxjs';

import {
  getCardanoAddresses,
  getCardanoParams,
  getCardanoUtxos,
  getPendingCardanoTxs,
  listWallets,
  setActiveCardanoNetwork,
  submitCardanoTx,
} from '../lace-client';
import {
  laceErrorToProviderError,
  mapHostParams,
  reconstructAddresses,
  transportUtxoToCardano,
} from '../mappers';
import { WalletResolver } from '../wallet-resolver';

import type { CardanoHostPullDependencies } from '../augmentations';
import type { EraSummary, SubmitTxArgs } from '@cardano-sdk/core';
import type {
  CardanoProviderContext,
  CardanoProviderDependencies,
  CardanoTokenMetadata,
  GetAccountRewardsProps,
  GetTokensProps,
  GetUtxosAtAddressProps,
} from '@lace-contract/cardano-context';
import type {
  BlockfrostPartialStakePool,
  BlockfrostStakePool,
  BlockfrostStakePoolMetadata,
  CardanoStakePoolsProviderDependencies,
  StakePoolsNetworkData,
} from '@lace-contract/cardano-stake-pools';
import type { LaceInit } from '@lace-contract/module';
import type { TokenMetadata } from '@lace-contract/tokens';
import type { BlockfrostConfig } from '@lace-lib/cardano-provider-core';
import type { Logger } from 'ts-log';

const getNetworkInfoProvider = memoize(
  (config: BlockfrostConfig, logger: Logger) =>
    new BlockfrostNetworkInfoProvider(getBlockfrostClient(config), logger),
  computeBlockfrostConfigIdentifier,
);

const getAssetProvider = memoize(
  (config: BlockfrostConfig, logger: Logger) =>
    new BlockfrostAssetProvider(getBlockfrostClient(config), logger),
  computeBlockfrostConfigIdentifier,
);

const getTokensProvider = memoize(
  (config: BlockfrostConfig, logger: Logger) =>
    new BlockfrostTokensProvider(getBlockfrostClient(config), logger),
  computeBlockfrostConfigIdentifier,
);

const getAccountActivityProvider = memoize(
  (config: BlockfrostConfig, logger: Logger) =>
    new BlockfrostActivityProvider(getBlockfrostClient(config), logger),
  computeBlockfrostConfigIdentifier,
);

const getAccountRewardsProvider = memoize(
  (config: BlockfrostConfig, logger: Logger) =>
    new BlockfrostRewardsProvider(getBlockfrostClient(config), logger),
  computeBlockfrostConfigIdentifier,
);

const getAccountDelegationsProvider = memoize(
  (config: BlockfrostConfig, logger: Logger) =>
    new BlockfrostDelegationsProvider(getBlockfrostClient(config), logger),
  computeBlockfrostConfigIdentifier,
);

const getAccountRegistrationsProvider = memoize(
  (config: BlockfrostConfig, logger: Logger) =>
    new BlockfrostRegistrationsProvider(getBlockfrostClient(config), logger),
  computeBlockfrostConfigIdentifier,
);

const getAccountWithdrawalsProvider = memoize(
  (config: BlockfrostConfig, logger: Logger) =>
    new BlockfrostWithdrawalsProvider(getBlockfrostClient(config), logger),
  computeBlockfrostConfigIdentifier,
);

const getInputResolverProvider = memoize(
  (config: BlockfrostConfig, logger: Logger) =>
    new BlockfrostInputResolverProvider(getBlockfrostClient(config), logger),
  computeBlockfrostConfigIdentifier,
);

// Arbitrary-address utxo lookups only — the wallet's OWN utxo set stays
// host-owned (getAccountUtxos below routes to window.lace).
const getUtxoProvider = memoize(
  (config: BlockfrostConfig, logger: Logger) =>
    new BlockfrostUtxoProvider(getBlockfrostClient(config), logger),
  computeBlockfrostConfigIdentifier,
);

const getGovernanceProvider = memoize(
  (config: BlockfrostConfig, logger: Logger) =>
    new BlockfrostGovernanceProvider(getBlockfrostClient(config), logger),
  computeBlockfrostConfigIdentifier,
);

const getStakePoolProvider = memoize(
  (config: BlockfrostConfig, logger: Logger) =>
    new BlockfrostStakePoolProvider(getBlockfrostClient(config), logger),
  computeBlockfrostConfigIdentifier,
);

const getBlockfrostConfig = (
  context: CardanoProviderContext,
  configs: Partial<Record<Cardano.NetworkMagic, BlockfrostConfig>>,
): BlockfrostConfig | undefined => configs[context.chainId.networkMagic];

// An unprovisioned network (no blockfrost endpoint in this build) yields an
// immediate, non-retriable error rather than a client that churns in a retry
// loop. NotImplemented is classified non-retriable by isRetriableError, so
// retryBackoff(PROVIDER_REQUEST_RETRY_CONFIG) surfaces it at once. Mirrors the
// host posture: an unconfigured network is left unprovisioned, never faked.
const unprovisionedNetworkError = (networkMagic: Cardano.NetworkMagic) =>
  new ProviderError(
    ProviderFailure.NotImplemented,
    undefined,
    `blockfrost is unprovisioned for network ${networkMagic}: no proxy endpoint configured (build with EXPO_PUBLIC_BLOCKFROST_PROXY_URL)`,
  );

// Coalesces the focus + visibilitychange pair that a single window activation
// fires into one re-arm, so ordinary attention changes cost at most one poll.
const WINDOW_REFOCUS_DEBOUNCE_MS = 250;

/**
 * Narrow the host's ACCOUNT-scoped utxo set (every discovered stake key in one
 * response) to the STAKE-scoped set `getAccountUtxos` promises. Without it a
 * multi-stake-key account gets the full set back once per stake key and the
 * caller's flatMap double-counts every outpoint.
 *
 * A utxo whose address carries no stake credential (enterprise — the host's
 * base-address walk never produces one) falls to the PRIMARY partition rather
 * than being dropped, so the partitions stay disjoint and their union stays the
 * full set.
 */
const utxosOfRewardAccount = (
  utxos: readonly Cardano.Utxo[],
  rewardAccount: Cardano.RewardAccount,
  primary: boolean,
): Cardano.Utxo[] => {
  const stakeKeyHash = Cardano.RewardAccount.toHash(rewardAccount);
  return utxos.filter(([, txOut]) => {
    const stakeCredential = Cardano.Address.fromString(String(txOut.address))
      ?.asBase()
      ?.getStakeCredential();
    return stakeCredential ? stakeCredential.hash === stakeKeyHash : primary;
  });
};

/**
 * The guest regains attention (ADR 34 stand-in for the absent completion push):
 * window `focus` or the document becoming visible again after a host ceremony
 * window closed. Returns `NEVER` outside a DOM context so store init never
 * throws where `window`/`document` are absent.
 */
const buildWindowRefocus$ =
  (): CardanoHostPullDependencies['windowRefocus$'] => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return NEVER;
    }
    return merge(
      fromEvent(window, 'focus').pipe(map(() => undefined)),
      fromEvent(document, 'visibilitychange').pipe(
        filter(() => document.visibilityState === 'visible'),
        map(() => undefined),
      ),
    ).pipe(debounceTime(WINDOW_REFOCUS_DEBOUNCE_MS));
  };

/**
 * The guest's composite `CardanoProvider`: the four host-owned
 * methods route to `window.lace` (params/utxos/addresses/submit), the rest
 * run free against blockfrost through the shared `@lace-lib/cardano-provider-core`
 * leaves. It is the sole implementor of both provider contracts in the guest —
 * `cardano-provider-blockfrost` is dropped there.
 */
export const initializeDependencies: LaceInit<
  CardanoHostPullDependencies &
    CardanoProviderDependencies &
    CardanoStakePoolsProviderDependencies
> = async (
  {
    runtime: {
      config: {
        cardanoProvider: { blockfrostConfigs },
      },
    },
    loadModules,
  },
  { logger },
) => {
  const bip32Ed25519 = (await loadModules('addons.bip32Ed25519'))[0];
  const blake2b = (await loadModules('addons.blake2b'))[0];
  const crypto = { blake2b, bip32Ed25519 };
  const resolver = new WalletResolver(listWallets, getCardanoAddresses, crypto);

  return {
    // Host `wallets.list` promise wrapped as an Observable (ADR 19) so the
    // hydrator's poll is marble-testable.
    listHostWallets: () => from(listWallets()),
    windowRefocus$: buildWindowRefocus$(),
    // Snapshotted once at store init (ADR 41 handshake): an older host without
    // the capability makes the active-network write-back no-op silently.
    canSetActiveNetwork: hasLaceCapability('settings.setActiveNetwork'),
    pushActiveCardanoNetwork: networkMagic =>
      from(setActiveCardanoNetwork(networkMagic)),
    // Same ADR 41 handshake snapshot: an older host without the capability
    // makes the pending-activity pull a silent no-op.
    canGetPendingCardanoTxs: hasLaceCapability('cardano.getPendingTxs'),
    getPendingCardanoTxs: ({ walletId, accountIndex, networkMagic }) =>
      from(getPendingCardanoTxs(walletId, accountIndex, networkMagic)),
    cardanoProvider: {
      // ---- free-running (blockfrost via the shared lib leaves) ----
      getTip: context => {
        const config = getBlockfrostConfig(context, blockfrostConfigs);
        if (!config)
          return of(
            Err<ProviderError>(
              unprovisionedNetworkError(context.chainId.networkMagic),
            ),
          );
        const provider = getNetworkInfoProvider(config, logger);
        return from(
          provider
            .ledgerTip()
            .then(Ok<Cardano.Tip>)
            .catch(Err<ProviderError>),
        );
      },
      getEraSummaries: context => {
        const config = getBlockfrostConfig(context, blockfrostConfigs);
        if (!config)
          return of(
            Err<ProviderError>(
              unprovisionedNetworkError(context.chainId.networkMagic),
            ),
          );
        const provider = getNetworkInfoProvider(config, logger);
        return from(
          provider
            .eraSummaries()
            .then(Ok<EraSummary[]>)
            .catch(Err<ProviderError>),
        );
      },
      getTokenMetadata: ({ tokenId }, context) => {
        if (tokenId === LOVELACE_TOKEN_ID) {
          const networkType = cardanoNetworkMagicToNetworkType(
            context.chainId.networkMagic,
          );
          const ticker = getAdaTokenTickerByNetwork(networkType);
          return of(
            Ok({ ...LOVELACE_METADATA, ticker, image: Blockchains.Cardano }),
          );
        }
        const config = getBlockfrostConfig(context, blockfrostConfigs);
        if (!config)
          return of(
            Err<ProviderError>(
              unprovisionedNetworkError(context.chainId.networkMagic),
            ),
          );
        const provider = getAssetProvider(config, logger);
        return from(
          provider
            .getAsset({
              assetId: Cardano.AssetId(tokenId),
              extraData: { nftMetadata: true, tokenMetadata: true },
            })
            .then(assetInfo =>
              Ok<TokenMetadata<CardanoTokenMetadata>>(
                toContractTokenMetadata(assetInfo),
              ),
            )
            .catch(Err<ProviderError>),
        );
      },
      getTokens: (props: GetTokensProps, context) => {
        const config = getBlockfrostConfig(context, blockfrostConfigs);
        if (!config)
          return of(
            Err<ProviderError>(
              unprovisionedNetworkError(context.chainId.networkMagic),
            ),
          );
        const provider = getTokensProvider(config, logger);
        return provider.getTokens(props);
      },
      getAccountRewards: (props: GetAccountRewardsProps, context) => {
        const config = getBlockfrostConfig(context, blockfrostConfigs);
        if (!config)
          return of(
            Err<ProviderError>(
              unprovisionedNetworkError(context.chainId.networkMagic),
            ),
          );
        const provider = getAccountRewardsProvider(config, logger);
        return provider.getAccountRewards(props);
      },
      getAccountDelegations: (props: GetAccountRewardsProps, context) => {
        const config = getBlockfrostConfig(context, blockfrostConfigs);
        if (!config)
          return of(
            Err<ProviderError>(
              unprovisionedNetworkError(context.chainId.networkMagic),
            ),
          );
        const provider = getAccountDelegationsProvider(config, logger);
        return provider.getAccountDelegations(props);
      },
      getAccountRegistrations: (
        props: GetAccountRewardsProps,
        context: CardanoProviderContext,
      ) => {
        const config = getBlockfrostConfig(context, blockfrostConfigs);
        if (!config)
          return of(
            Err<ProviderError>(
              unprovisionedNetworkError(context.chainId.networkMagic),
            ),
          );
        const provider = getAccountRegistrationsProvider(config, logger);
        return provider.getAccountRegistrations(props);
      },
      getAccountWithdrawals: (
        props: GetAccountRewardsProps,
        context: CardanoProviderContext,
      ) => {
        const config = getBlockfrostConfig(context, blockfrostConfigs);
        if (!config)
          return of(
            Err<ProviderError>(
              unprovisionedNetworkError(context.chainId.networkMagic),
            ),
          );
        const provider = getAccountWithdrawalsProvider(config, logger);
        return provider.getAccountWithdrawals(props);
      },
      getRewardAccountInfo: (props: GetAccountRewardsProps, context) => {
        const config = getBlockfrostConfig(context, blockfrostConfigs);
        if (!config)
          return of(
            Err<ProviderError>(
              unprovisionedNetworkError(context.chainId.networkMagic),
            ),
          );
        const provider = getAccountRewardsProvider(config, logger);
        return provider.getRewardAccountInfo(props);
      },
      getAddressTransactionHistory: (props, context) => {
        const config = getBlockfrostConfig(context, blockfrostConfigs);
        if (!config)
          return of(
            Err<ProviderError>(
              unprovisionedNetworkError(context.chainId.networkMagic),
            ),
          );
        const provider = getAccountActivityProvider(config, logger);
        return provider.getAddressTransactionHistory(props);
      },
      getTransactionDetails: (txId: Cardano.TransactionId, context) => {
        const config = getBlockfrostConfig(context, blockfrostConfigs);
        if (!config)
          return of(
            Err<ProviderError>(
              unprovisionedNetworkError(context.chainId.networkMagic),
            ),
          );
        const provider = getAccountActivityProvider(config, logger);
        return provider.getTransactionDetails(txId);
      },
      resolveInput: (txIn: Cardano.TxIn, context) => {
        const config = getBlockfrostConfig(context, blockfrostConfigs);
        if (!config)
          return of(
            Err<ProviderError>(
              unprovisionedNetworkError(context.chainId.networkMagic),
            ),
          );
        const provider = getInputResolverProvider(config, logger);
        return from(
          provider
            .resolveInput(txIn)
            .then(Ok<Cardano.TxOut | null>)
            .catch(Err<ProviderError>),
        );
      },
      getUtxosAtAddress: (props: GetUtxosAtAddressProps, context) => {
        const config = getBlockfrostConfig(context, blockfrostConfigs);
        if (!config)
          return of(
            Err<ProviderError>(
              unprovisionedNetworkError(context.chainId.networkMagic),
            ),
          );
        const provider = getUtxoProvider(config, logger);
        return provider.getUtxosAtAddress(props);
      },
      getDReps: context => {
        const config = getBlockfrostConfig(context, blockfrostConfigs);
        if (!config)
          return of(
            Err<ProviderError>(
              unprovisionedNetworkError(context.chainId.networkMagic),
            ),
          );
        const provider = getGovernanceProvider(config, logger);
        return provider.getDReps();
      },

      // ---- host-owned (routed to window.lace) ----
      getProtocolParameters: context => {
        const config = getBlockfrostConfig(context, blockfrostConfigs);
        if (!config)
          return of(
            Err<ProviderError>(
              unprovisionedNetworkError(context.chainId.networkMagic),
            ),
          );
        return combineLatest([
          from(
            getNetworkInfoProvider(config, logger)
              .protocolParameters()
              .then(Ok<Cardano.ProtocolParameters>)
              .catch(Err<ProviderError>),
          ),
          from(getCardanoParams(context.chainId.networkMagic)),
        ]).pipe(
          map(([full, host]) => {
            if (!full.isOk()) return full;
            if (!host.ok) return Err(laceErrorToProviderError(host.error));
            // Host-authoritative on the load-bearing subset (matches the host
            // sign summary); the remaining SDK fields come from blockfrost so
            // the type is satisfied without fabricating anything guest-side.
            return Ok<Cardano.ProtocolParameters>({
              ...full.value,
              ...mapHostParams(host.value),
            });
          }),
        );
      },
      getAccountUtxos: ({ rewardAccount }: GetAccountRewardsProps, context) =>
        from(
          resolver.accountForRewardAccount(
            String(rewardAccount),
            context.chainId,
          ),
        ).pipe(
          switchMap(account => {
            if (!account)
              return of(
                Err<ProviderError>(
                  new ProviderError(
                    ProviderFailure.Unknown,
                    undefined,
                    `no wallet for reward account ${rewardAccount}`,
                  ),
                ),
              );
            return from(
              getCardanoUtxos(
                account.walletId,
                account.accountIndex,
                context.chainId.networkMagic,
              ),
            ).pipe(
              map(result => {
                if (!result.ok)
                  return Err<ProviderError>(
                    laceErrorToProviderError(result.error),
                  );
                return Ok(
                  utxosOfRewardAccount(
                    result.value.utxos.map(transportUtxoToCardano),
                    Cardano.RewardAccount(String(rewardAccount)),
                    account.primary,
                  ),
                );
              }),
            );
          }),
        ),
      // `thorough` (the AccountSettings "HD wallet sync" control → an
      // ADDRESS_DISCOVERY_THOROUGH sync operation) MUST reach the host: the host
      // owns the gap walk and persists it per (xpub, networkMagic) without ever
      // re-validating it, so this is the only path that widens a stale record.
      // Dropping it here made the control a spinner that changed nothing.
      discoverAddresses: ({ xpub, accountIndex, thorough }, context) =>
        from(resolver.accountForXpub(xpub, context.chainId)).pipe(
          switchMap(account => {
            if (!account)
              return of(
                Err(
                  new ProviderError(
                    ProviderFailure.Unknown,
                    undefined,
                    'no wallet for xpub',
                  ),
                ),
              );
            return from(
              getCardanoAddresses({
                walletId: account.walletId,
                accountIndex: account.accountIndex,
                networkMagic: context.chainId.networkMagic,
                forceRediscover: thorough === true,
              }),
            ).pipe(
              switchMap(result => {
                if (!result.ok)
                  return of(Err(laceErrorToProviderError(result.error)));
                return from(
                  reconstructAddresses({
                    xpub,
                    accountIndex,
                    chainId: context.chainId,
                    external: result.value.addresses,
                    internal: result.value.internal,
                    crypto,
                  }),
                ).pipe(
                  switchMap(({ addresses, matched }) => {
                    // EVERY host address must be re-derivable, not merely one:
                    // a shortfall means the guest would serve a PARTIAL address
                    // set — utxos and history behind the missing addresses
                    // silently vanish. Known cause: baked network-magic drift
                    // (derived ∩ host = ∅) — the reconstruction walks stake
                    // keys the way the host does (see mappers.ts).
                    const expected =
                      result.value.addresses.length +
                      result.value.internal.length;
                    if (matched < expected) {
                      return of(
                        Err(
                          new ProviderError(
                            ProviderFailure.Unknown,
                            undefined,
                            `host returned ${expected} addresses but only ${matched} matched the xpub-derived candidates (network magic mismatch? stake key beyond the reconstruction gap?)`,
                          ),
                        ),
                      );
                    }
                    return from(addresses.map(address => Ok(address)));
                  }),
                );
              }),
            );
          }),
        ),
      submitTx: (props: SubmitTxArgs, context) => {
        // Account-agnostic on the wire: the host decodes the inputs and
        // attributes the pending overlay to the owning account itself (the
        // guest outpoint cache retired), so the guest only names the network.
        const signedTransaction = String(props.signedTransaction);
        return from(
          submitCardanoTx(signedTransaction, context.chainId.networkMagic),
        ).pipe(
          map(result =>
            result.ok
              ? Ok(Cardano.TransactionId(result.value.txHash))
              : Err<ProviderError>(laceErrorToProviderError(result.error)),
          ),
        );
      },
    },
    cardanoStakePoolsProvider: {
      getMetadata: (poolId: Cardano.PoolId, context) => {
        const config = getBlockfrostConfig(context, blockfrostConfigs);
        if (!config)
          return of(
            Err<ProviderError>(
              unprovisionedNetworkError(context.chainId.networkMagic),
            ),
          );
        const provider = getStakePoolProvider(config, logger);
        return from(
          provider
            .getMetadata(poolId)
            .then(Ok<BlockfrostStakePoolMetadata | null>)
            .catch(Err<ProviderError>),
        );
      },
      getNetworkData: context => {
        const config = getBlockfrostConfig(context, blockfrostConfigs);
        if (!config)
          return of(
            Err<ProviderError>(
              unprovisionedNetworkError(context.chainId.networkMagic),
            ),
          );
        const provider = getStakePoolProvider(config, logger);
        return from(
          provider
            .getNetworkData()
            .then(Ok<StakePoolsNetworkData>)
            .catch(Err<ProviderError>),
        );
      },
      getStakePool: (poolId: Cardano.PoolId, context) => {
        const config = getBlockfrostConfig(context, blockfrostConfigs);
        if (!config)
          return of(
            Err<ProviderError>(
              unprovisionedNetworkError(context.chainId.networkMagic),
            ),
          );
        const provider = getStakePoolProvider(config, logger);
        return from(
          provider
            .getStakePool(poolId)
            .then(Ok<BlockfrostStakePool | null>)
            .catch(Err<ProviderError>),
        );
      },
      getStakePools: context => {
        const config = getBlockfrostConfig(context, blockfrostConfigs);
        if (!config)
          return of(
            Err<ProviderError>(
              unprovisionedNetworkError(context.chainId.networkMagic),
            ),
          );
        const provider = getStakePoolProvider(config, logger);
        return from(
          provider
            .getStakePools()
            .then(Ok<BlockfrostPartialStakePool[]>)
            .catch(Err<ProviderError>),
        );
      },
    },
  };
};
