import {
  CardanoPaymentAddress,
  estimateSignedTxSize,
} from '@lace-contract/cardano-context';
import { resolveEarnRewardsTarget } from '@lace-contract/earn-rewards';
import { WalletType } from '@lace-contract/wallet-repo';
import { BigNumber } from '@lace-lib/util';
import {
  catchError,
  combineLatest,
  concat,
  EMPTY,
  firstValueFrom,
  from,
  map,
  merge,
  of,
  switchMap,
  takeUntil,
  throwError,
  timeout,
  withLatestFrom,
} from 'rxjs';

import {
  blockedWithdrawableRewards,
  buildSweepTx,
  chunkSweepPlan,
  countScriptUtxos$,
  delegationReserve,
  evaluateSweepability,
  fetchRewardInfos$,
  isUnbalanceableSweepError,
  planAccountMapping,
  summarize,
  uniqueRewardAccounts,
} from '../helpers';

import {
  assembleSweepPlan,
  createSourceContext$,
  DISCOVERY_TIMEOUT_MS,
  mergeAccountResolutions,
} from './create-source-context';
import { freshDestinationMapping$ } from './destination-freshness';
import {
  makeDeviceAccountSource,
  makeLoadedWalletAccountSource,
} from './device-account-source';
import { failure } from './failure';
import { scanActiveAccounts } from './scan-active-accounts';

import type {
  SourceContext,
  SourceContextResolver,
} from './create-source-context';
import type { DeviceAccountSource } from './device-account-source';
import type {
  AccountResolution,
  ActiveAccountScan,
} from './scan-active-accounts';
import type { SideEffect } from '../..';
import type { SweepBuildOutcome, SweepPlan } from '../helpers';
import type { AccountMapping } from '../slice';
import type { Cardano, Serialization } from '@cardano-sdk/core';
import type {
  AnyWallet,
  HardwareWallet,
  InMemoryWallet,
} from '@lace-contract/wallet-repo';
import type { Observable } from 'rxjs';

/**
 * Runs the dry build that estimates the sweep fee, unless an earlier check has
 * already decided to refuse. Skips the build when the source holds rewards a
 * single-tx sweep cannot move, or has no UTxO to pay the fee, both permanent
 * refusals, so a build error cannot turn one into a retryable failure.
 *
 * When a single-tx sweep exceeds maxTxSize, partitions the UTxOs into multiple
 * chunks (FR-6) and sums their fees. If chunking itself fails (e.g. a single
 * UTxO exceeds maxTxSize), surfaces as `built: false`.
 */
const buildSweepOutcome$ = (
  context: SourceContext,
  rewardInfos: SweepPlan['rewardInfos'],
  buildTxFunction: (plan: SweepPlan) => Observable<Serialization.Transaction>,
): Observable<SweepBuildOutcome> => {
  const shouldBuild =
    blockedWithdrawableRewards(rewardInfos) === 0n && context.utxos.length > 0;
  if (!shouldBuild) return of<SweepBuildOutcome>({ built: false });

  const plan = assembleSweepPlan(
    context,
    rewardInfos,
    CardanoPaymentAddress(context.addresses[0].address),
  );

  return buildTxFunction(plan).pipe(
    switchMap(tx => {
      if (
        estimateSignedTxSize(tx, context.utxos) <=
        context.protocolParameters.maxTxSize
      ) {
        return of<SweepBuildOutcome>({
          built: true,
          fee: tx.toCore().body.fee,
          chunkCount: 1,
        });
      }

      // Single tx oversized — attempt chunking (FR-6).
      return from(
        chunkSweepPlan({
          utxos: context.utxos,
          rewardInfos,
          protocolParameters: context.protocolParameters,
          networkMagic: context.chainId.networkMagic,
          destinationAddress: plan.destinationAddress,
          buildTxFunction: async chunkPlan =>
            firstValueFrom(buildTxFunction(chunkPlan)),
        }),
      ).pipe(
        switchMap(chunks =>
          // Build each chunk to sum the fees.
          from(
            Promise.all(
              chunks.map(async chunk =>
                firstValueFrom(
                  buildTxFunction({
                    ...plan,
                    utxos: chunk.utxos,
                    rewardInfos: chunk.rewardInfos,
                  }),
                ).then(chunkTx => chunkTx.toCore().body.fee),
              ),
            ),
          ).pipe(
            map(
              (fees): SweepBuildOutcome => ({
                built: true,
                fee: fees.reduce((sum, fee) => sum + fee, 0n),
                chunkCount: chunks.length,
              }),
            ),
          ),
        ),
        catchError(() => of<SweepBuildOutcome>({ built: false })),
      );
    }),
    catchError((error: unknown) =>
      isUnbalanceableSweepError(error)
        ? of<SweepBuildOutcome>({ built: false })
        : throwError(() => error),
    ),
  );
};

type SideEffectDeps = Parameters<SideEffect>[2];

/** Families whose connector can export an xpub per account index on demand. */
const canExportAccountsOnDevice = (wallet: AnyWallet | undefined): boolean =>
  wallet?.type === WalletType.HardwareLedger ||
  wallet?.type === WalletType.HardwareTrezor;

/**
 * What preserve mode would cost: one dry build per funded source account
 * (change standing in at that account's own first address, like the
 * consolidated dry build), fees summed. Rewards ride their own account, or
 * the first funded one when theirs holds no input — mirroring the planner.
 * `undefined` for single-account sources (the modes are identical) or when
 * any per-account build fails — the review then keeps consolidated figures,
 * and the sweep's own build remains the authority.
 */
const estimatePreserveCost$ = ({
  merged,
  rewardInfos,
  buildTxFunction,
  setupReserve,
}: {
  merged: SourceContext;
  rewardInfos: SweepPlan['rewardInfos'];
  buildTxFunction: (plan: SweepPlan) => Observable<Serialization.Transaction>;
  /** Deposit + delegation fee each landing account must cover on its own. */
  setupReserve: bigint;
}): Observable<
  | {
      fee: bigint;
      txCount: number;
      withdrawableRewards: bigint;
      unfundedSetupAccounts: number[];
      unmigratableAccounts: number[];
    }
  | undefined
> => {
  const accountIndexByAddress = new Map(
    merged.addresses.map(({ address, accountIndex }) => [
      `${address}`,
      accountIndex,
    ]),
  );
  const accountIndexByRewardAccount = new Map(
    merged.addresses.map(({ rewardAccount, accountIndex }) => [
      `${rewardAccount}`,
      accountIndex,
    ]),
  );
  const firstAddressByAccount = new Map<number, string>();
  for (const { address, accountIndex } of merged.addresses) {
    if (!firstAddressByAccount.has(accountIndex)) {
      firstAddressByAccount.set(accountIndex, `${address}`);
    }
  }

  const utxosByAccount = new Map<number, Cardano.Utxo[]>();
  for (const utxo of merged.utxos) {
    const index = accountIndexByAddress.get(`${utxo[1].address}`) ?? 0;
    utxosByAccount.set(index, [...(utxosByAccount.get(index) ?? []), utxo]);
  }
  const funded = [...utxosByAccount.keys()].sort((a, b) => a - b);
  if (funded.length <= 1) return of(undefined);

  // Only the account's own rewards: a rewards-only account is not migrated
  // in preserve mode (its withdrawal elsewhere would link accounts), so its
  // rewards appear in no transaction and no fee.
  const rewardsFor = (index: number) =>
    rewardInfos.filter(
      info =>
        accountIndexByRewardAccount.get(`${info.rewardAccount}`) === index,
    );

  const coinFor = (index: number) =>
    (utxosByAccount.get(index) ?? []).reduce(
      (sum, [, output]) => sum + BigNumber.valueOf(output.value.coins),
      0n,
    ) +
    rewardsFor(index).reduce(
      (sum, info) => sum + BigNumber.valueOf(info.withdrawableAmount),
      0n,
    );

  return from(
    Promise.allSettled(
      funded.map(async index =>
        firstValueFrom(
          buildTxFunction({
            protocolParameters: merged.protocolParameters,
            networkMagic: merged.chainId.networkMagic,
            destinationAddress: CardanoPaymentAddress(
              firstAddressByAccount.get(index)!,
            ),
            utxos: utxosByAccount.get(index)!,
            rewardInfos: rewardsFor(index),
          }).pipe(map(tx => ({ index, fee: tx.toCore().body.fee }))),
        ),
      ),
    ),
  ).pipe(
    map(settled => {
      const built = settled.flatMap(result =>
        result.status === 'fulfilled' ? [result.value] : [],
      );
      const canMigrate = (index: number) =>
        built.some(entry => entry.index === index);
      return {
        fee: built.reduce((sum, { fee }) => sum + fee, 0n),
        // Only the accounts that actually get a transaction.
        txCount: built.length,
        // Rewards ride their own account's transaction, so only the accounts
        // that migrate bring theirs.
        withdrawableRewards: rewardInfos
          .filter(info => {
            const owner = accountIndexByRewardAccount.get(
              `${info.rewardAccount}`,
            );
            return owner !== undefined && canMigrate(owner);
          })
          .reduce(
            (sum, info) => sum + BigNumber.valueOf(info.withdrawableAmount),
            0n,
          ),
        // Preserve mode pays a deposit per account out of that account's own
        // arriving funds, so the sweep-wide reserve check cannot speak for them.
        // An account that lands short is disclosed, not silently left to fail
        // at delegation time.
        unfundedSetupAccounts: built
          .filter(({ index, fee }) => coinFor(index) - fee < setupReserve)
          .map(({ index }) => index),
        /**
         * Accounts holding UTxOs that still cannot fund their own transaction —
         * the dry build above is exactly that test, withdrawal included. They
         * are not migratable in preserve mode: attempting one fails the build
         * at sweep time and takes the whole migration with it.
         */
        unmigratableAccounts: funded.filter(index => !canMigrate(index)),
      };
    }),
    catchError(() => of(undefined)),
  );
};

/** What the mapping planner needs to know about the chosen destination. */
type DestinationPlanInput = {
  wallet: AnyWallet | undefined;
  /** Existing wallets keep their history untouched: migrated funds land in
   * fresh accounts past their highest Cardano account. */
  isExisting: boolean;
  networkId: unknown;
  /** The picked account's index — where funds land when no fresh account can
   * be created for them. */
  pickedAccountIndex: number | undefined;
  /** The picked account is already delegated to a stake pool on-chain. Only
   * meaningful on the fixed-index path, where the picked account IS the
   * landing account; probed paths land on fresh indexes. */
  pickedAccountAlreadyStakes: boolean;
};

/**
 * Whether the destination can create the accounts preservation needs: an
 * in-memory wallet derives them from its encrypted root, and a Ledger or
 * Trezor exports them on-device (one approval each, collected before the
 * review). An air-gapped family has no per-index export, so it receives
 * everything at the account the user picked.
 */
const canGrowAccounts = (wallet: AnyWallet | undefined): boolean =>
  Boolean(
    (wallet as InMemoryWallet | undefined)?.blockchainSpecific?.Cardano
      ?.encryptedRootPrivateKey,
  ) || canExportAccountsOnDevice(wallet);

/**
 * From the merged all-accounts context, fetch reward info, run the dry build,
 * and turn the sweepability verdict into the terminal discovery action: a
 * refusal (migrationUnsupported) or discoveryCompleted carrying the summary and
 * the pinned reviewed plan.
 */
const resolveDiscoveryAction$ = (
  {
    merged,
    scannedThroughAccountIndex,
    scriptUtxoCount,
    hasDelegationTarget,
    needsPoolChoice,
    destination,
  }: {
    merged: SourceContext;
    scannedThroughAccountIndex: number;
    scriptUtxoCount: number;
    hasDelegationTarget: boolean;
    needsPoolChoice: boolean;
    destination: DestinationPlanInput;
  },
  buildTxFunction: (plan: SweepPlan) => Observable<Serialization.Transaction>,
  dependencies: SideEffectDeps,
) =>
  fetchRewardInfos$(
    uniqueRewardAccounts(merged.addresses),
    merged.chainId,
    dependencies.cardanoProvider,
  ).pipe(
    switchMap(rewardInfos =>
      combineLatest([
        buildSweepOutcome$(merged, rewardInfos, buildTxFunction),
        estimatePreserveCost$({
          merged,
          rewardInfos,
          buildTxFunction,
          setupReserve: delegationReserve({
            hasDelegationTarget,
            protocolParameters: merged.protocolParameters,
          }),
        }),
      ]).pipe(
        switchMap(([buildOutcome, preserveCost]) => {
          const preserveEstimate =
            preserveCost === undefined
              ? {}
              : {
                  preserveEstimatedFee: `${preserveCost.fee}`,
                  preserveTxCount: preserveCost.txCount,
                  preserveWithdrawableRewards: `${preserveCost.withdrawableRewards}`,
                  preserveUnfundedSetupAccounts:
                    preserveCost.unfundedSetupAccounts,
                };
          const verdict = evaluateSweepability(
            {
              utxos: merged.utxos,
              rewardInfos,
              delegationReserve: delegationReserve({
                hasDelegationTarget,
                protocolParameters: merged.protocolParameters,
              }),
            },
            buildOutcome,
          );
          if (verdict.kind === 'refuse') {
            return of(
              dependencies.actions.migrateWallet.migrationUnsupported({
                errorKey: verdict.errorKey,
                amount: verdict.amount,
              }),
            );
          }
          /**
           * Where each source account stakes today, so preserve mode can leave
           * it there rather than moving every account to one pool. Read from
           * the reward info the sweep already fetched, keyed by the same
           * address attribution the plan uses.
           */
          const poolByAccountIndex = new Map<number, string>();
          for (const { rewardAccount, accountIndex } of merged.addresses) {
            if (poolByAccountIndex.has(accountIndex)) continue;
            const info = rewardInfos.find(
              candidate => `${candidate.rewardAccount}` === `${rewardAccount}`,
            );
            if (info?.poolId !== undefined)
              poolByAccountIndex.set(accountIndex, `${info.poolId}`);
          }

          const canPreserveAccounts = canGrowAccounts(destination.wallet);
          const plannedMapping = planAccountMapping({
            utxos: merged.utxos,
            addresses: merged.addresses,
            destinationWallet: destination.wallet,
            isExistingDestination: destination.isExisting,
            blockchainNetworkId: destination.networkId,
            fixedDestinationAccountIndex: canPreserveAccounts
              ? undefined
              : destination.pickedAccountIndex,
          }).map(row => ({
            ...row,
            /**
             * The rule that decides whether an account migrates in preserve
             * mode: its own UTxOs must fund its own transaction, its reward
             * withdrawal included. Nothing else qualifies it — rewards cannot
             * pay a fee, and a registered stake key's deposit is not spendable.
             *
             * The per-account dry build above IS that test, so the verdict is
             * recorded here rather than re-derived by every consumer from
             * `utxoCount`, which only ever approximated it: an account holding
             * dust passed that proxy, was promised on the review, and then
             * failed the build at sweep time — taking the whole migration with
             * it.
             *
             * Falls back to the proxy when no per-account estimate exists (a
             * single funded account, where the modes are identical anyway).
             */
            canFundOwnTransaction:
              preserveCost === undefined
                ? row.utxoCount > 0
                : row.utxoCount > 0 &&
                  !preserveCost.unmigratableAccounts.includes(
                    row.sourceAccountIndex,
                  ),
            /**
             * Where this source account stakes today, so preserve mode can
             * leave it there. Read from the reward info the sweep already
             * fetched — the same figures the plan's rewards come from, so no
             * extra request.
             */
            sourcePoolId: poolByAccountIndex.get(row.sourceAccountIndex),
          }));
          // The mode screen is skipped when there is no choice to make, and it
          // is where a hardware destination's device is normally collected. If
          // consolidate still has to create its landing account, collect it
          // straight from here instead — otherwise the sweep falls back to the
          // account the user picked while the review promises a new one.
          const needsDestinationDeviceForConsolidate = (
            accountMapping: AccountMapping,
          ) => {
            // The mode screen collects it when there is a choice to make.
            if (accountMapping.length > 1 && canPreserveAccounts) return false;
            // Air-gapped: no per-index export, so it lands on the picked
            // account and there is nothing a device could add.
            if (!canExportAccountsOnDevice(destination.wallet)) return false;
            // Every export-capable hardware destination, whether or not the
            // planned index is already loaded. This deliberately does NOT skip
            // for a loaded landing account: loaded says nothing about on-chain
            // use, and the probe needs the device to walk PAST a loaded index
            // that turns out used. Skipping the device skipped the probe with
            // it, and reused an account with history — the FR-13 guarantee.
            return accountMapping.length > 0;
          };
          // A landing account that already stakes needs no pool choice:
          // delegationPlan refuses to move an existing delegation, so the
          // transaction is vote-only and a collected pick would be silently
          // discarded — asked, then ignored (LW-15312). Only the fixed-index
          // landing can be such an account: every probed path lands on a fresh
          // index, and a fixed index implies preserve is unavailable, so this
          // cannot starve hasPoolLeftToChoose's preserve reasoning. Reward
          // info that lags the trigger keeps asking — for a staking account
          // that is the asked-then-discarded pick this exists to prevent, but
          // the residual window is one sync behind and a discovery retry
          // re-samples; skipping on unknown would instead skip a NEEDED
          // set-up.
          const isLandingAlreadyStaking =
            !canPreserveAccounts && destination.pickedAccountAlreadyStakes;
          const completed = (accountMapping: AccountMapping) =>
            dependencies.actions.migrateWallet.discoveryCompleted({
              supportsPreservation: canPreserveAccounts,
              needsDestinationDevice:
                needsDestinationDeviceForConsolidate(accountMapping),
              needsPoolChoice: needsPoolChoice && !isLandingAlreadyStaking,
              accountMapping,
              discovery: {
                ...summarize({
                  utxos: merged.utxos,
                  rewardInfos,
                  estimatedFee: verdict.estimatedFee,
                  sweptAccountCount: merged.signingAccounts.length,
                  scannedThroughAccountIndex,
                  scriptUtxoCount,
                  chunkCount: verdict.chunkCount,
                  protocolParameters: merged.protocolParameters,
                }),
                ...preserveEstimate,
              },
              // Pin the reviewed set so the sweep replays it verbatim.
              reviewedPlan: {
                chainId: merged.chainId,
                protocolParameters: merged.protocolParameters,
                utxos: merged.utxos,
                addresses: merged.addresses,
                signingAccounts: merged.signingAccounts,
              },
            });
          // Probed here rather than at derivation time: the probe is several
          // provider calls, and running it between the source device connecting
          // and the signing request cost us the WebUSB handle.
          return freshDestinationMapping$(
            {
              mapping: plannedMapping,
              wallet: destination.wallet,
              blockchainNetworkId: destination.networkId,
              // The same signal `planAccountMapping` was given, so "fixed" is
              // stated rather than guessed from the shape of the plan.
              fixedDestinationAccountIndex: canPreserveAccounts
                ? undefined
                : destination.pickedAccountIndex,
            },
            dependencies,
          ).pipe(map(completed));
        }),
      ),
    ),
  );

/**
 * Persists device-probed active accounts onto the source wallet entry. The
 * signer factory resolves signers from `wallet.accounts` only, so an account
 * the scan found but never persisted would make the sweep unsignable.
 * Idempotent across discovery retries: already-present ids are skipped.
 */
const mergeScannedDeviceAccounts$ = (
  {
    wallet,
    resolutions,
    deviceSource,
  }: {
    wallet: AnyWallet;
    resolutions: readonly AccountResolution[];
    deviceSource: DeviceAccountSource | undefined;
  },
  { actions }: SideEffectDeps,
) => {
  if (!deviceSource || resolutions.length === 0) return EMPTY;
  const existing = new Set(wallet.accounts.map(account => account.accountId));
  const newAccounts = resolutions
    .flatMap(resolution =>
      deviceSource.accountsForIndex(resolution.accountIndex),
    )
    .filter(account => !existing.has(account.accountId));
  if (newAccounts.length === 0) return EMPTY;
  return of(
    actions.wallets.updateWallet({
      id: wallet.walletId,
      changes: {
        accounts: [...(wallet as HardwareWallet).accounts, ...newAccounts],
      } as Partial<HardwareWallet>,
    }),
  );
};

/**
 * Scans accounts 1+ (device-probed for a hardware source), persists any
 * device-found active accounts, and resolves the terminal discovery action
 * over the merged all-accounts union. Extracted from the trigger pipeline so
 * the rx chain stays within four nested functions.
 */
const scanAndResolve$ = (
  {
    context,
    deviceSource,
    hasDelegationTarget,
    needsPoolChoice,
    destination,
    scan,
    buildTxFunction,
  }: {
    context: SourceContext;
    deviceSource: DeviceAccountSource | undefined;
    hasDelegationTarget: boolean;
    needsPoolChoice: boolean;
    destination: DestinationPlanInput;
    scan: ActiveAccountScan;
    buildTxFunction: (plan: SweepPlan) => Observable<Serialization.Transaction>;
  },
  dependencies: SideEffectDeps,
) =>
  scan(
    {
      wallet: context.wallet,
      chainId: context.chainId,
      deviceXpubSource: deviceSource?.xpubForIndex,
      knownAccountIndexes: deviceSource?.knownAccountIndexes,
    },
    {
      cardanoProvider: dependencies.cardanoProvider,
      accessAuthSecret: dependencies.accessAuthSecret,
      logger: dependencies.logger,
    },
  ).pipe(
    switchMap(({ resolutions, scannedThroughAccountIndex, scriptUtxoCount }) =>
      // Account 0's dropped set never reaches the store, so its script count
      // is read back from the provider and added to the scanned accounts'
      // total. Without it a single-account wallet discloses nothing.
      countScriptUtxos$(
        context.addresses,
        context.chainId,
        dependencies.cardanoProvider,
      ).pipe(
        switchMap(sourceAccountScriptUtxoCount =>
          concat(
            // The signer factory signs only accounts present on the wallet
            // entry, so the device-probed active accounts are persisted before
            // review. Idempotent across retries: present ids are skipped.
            mergeScannedDeviceAccounts$(
              { wallet: context.wallet, resolutions, deviceSource },
              dependencies,
            ),
            resolveDiscoveryAction$(
              {
                merged: mergeAccountResolutions(context, resolutions),
                scannedThroughAccountIndex,
                scriptUtxoCount: scriptUtxoCount + sourceAccountScriptUtxoCount,
                hasDelegationTarget,
                needsPoolChoice,
                destination,
              },
              buildTxFunction,
              dependencies,
            ),
          ),
        ),
      ),
    ),
  );

/**
 * FR-3: once the imported source syncs, aggregate what will move and estimate
 * the fee with a dry build. The dry build uses the source's own first address
 * as a change stand-in, the destination does not exist yet and the fee does
 * not depend on which address receives change.
 */
export const makeRunDiscovery =
  ({
    resolveSourceContext = createSourceContext$,
    buildTxFunction = plan => from(buildSweepTx(plan)),
    scanActiveAccounts$ = scanActiveAccounts,
  }: {
    resolveSourceContext?: SourceContextResolver;
    buildTxFunction?: (
      plan: SweepPlan,
    ) => Observable<Serialization.Transaction>;
    scanActiveAccounts$?: ActiveAccountScan;
  } = {}): SideEffect =>
  (actionObservables, stateObservables, dependencies) =>
    merge(
      actionObservables.migrateWallet.sourceImported$,
      // An already-loaded source skips the import entirely; its payload names
      // the same ids, so discovery runs the identical pipeline.
      actionObservables.migrateWallet.loadedSourceChosen$,
      // Same payload shape, so a retry re-enters this pipeline identically
      // rather than through a second copy of it.
      actionObservables.migrateWallet.discoveryRetryRequested$,
    ).pipe(
      withLatestFrom(
        stateObservables.features.selectLoadedFeatures$,
        stateObservables.migrateWallet.selectPendingHwSource$,
        stateObservables.migrateWallet.selectDestinationType$,
        stateObservables.migrateWallet.selectDestinationWalletId$,
        stateObservables.migrateWallet.selectDestinationAccountId$,
        stateObservables.wallets.selectAll$,
        stateObservables.cardanoContext.selectRewardAccountDetails$,
      ),
      switchMap(
        ([
          { payload },
          features,
          pendingHwSource,
          destinationType,
          destinationWalletId,
          destinationAccountId,
          allWallets,
          rewardAccountDetails,
        ]) =>
          resolveSourceContext(payload, stateObservables).pipe(
            switchMap(context => {
              const sourceAccount = context.wallet.accounts.find(
                account => account.accountId === payload.sourceAccountId,
              );
              // A hardware source's accounts 1+ are probed on the device the
              // wizard captured. A LOADED source without a captured device
              // (picked from the wallet list) scans its own account entities
              // instead — no ceremony, indices beyond the loaded set read as
              // unused. In-memory sources ignore this: the scan derives from
              // their encrypted root.
              const deviceSource$ =
                pendingHwSource && sourceAccount
                  ? from(
                      makeDeviceAccountSource(
                        {
                          wallet: context.wallet,
                          hwSource: pendingHwSource,
                          targetNetworkId: sourceAccount.blockchainNetworkId,
                        },
                        dependencies,
                      ),
                    )
                  : of(
                      sourceAccount
                        ? makeLoadedWalletAccountSource(
                            context.wallet,
                            sourceAccount.blockchainNetworkId,
                          )
                        : undefined,
                    );
              // The destination will be delegated after the sweep, so what
              // arrives must still cover that transaction. Any target shape
              // qualifies: with no promoted pool the wizard asks the user to
              // choose one (LW-15293), so the reserve must assume the set-up
              // runs. Declining later leaves the reserve unspent — a
              // conservative refusal, never a doomed build.
              const delegationTarget = resolveEarnRewardsTarget({
                featureFlags: features.featureFlags,
                chainId: context.chainId,
              });
              const hasDelegationTarget = delegationTarget !== undefined;
              const shouldChoosePool =
                delegationTarget !== undefined &&
                delegationTarget.poolId === undefined;
              // The mapping plans where each account lands, so it needs the
              // chosen destination: an existing wallet's rows start past its
              // own accounts, a wizard-created one starts at its unused 0.
              const destinationWallet = allWallets.find(
                wallet => wallet.walletId === destinationWalletId,
              );
              const destination: DestinationPlanInput = {
                wallet: destinationWallet,
                isExisting: destinationType === 'existing',
                networkId: sourceAccount?.blockchainNetworkId,
                pickedAccountIndex: (
                  destinationWallet?.accounts.find(
                    account => account.accountId === destinationAccountId,
                  )?.blockchainSpecific as { accountIndex?: number } | undefined
                )?.accountIndex,
                pickedAccountAlreadyStakes:
                  destinationAccountId !== undefined &&
                  Boolean(
                    rewardAccountDetails[destinationAccountId]
                      ?.rewardAccountInfo?.poolId,
                  ),
              };
              // Collect every active account: the store account 0 and the
              // provider-scanned accounts 1+ (multi-account is swept in one
              // tx). Refusals then run over the flat all-accounts union.
              return deviceSource$.pipe(
                switchMap(deviceSource =>
                  scanAndResolve$(
                    {
                      context,
                      deviceSource,
                      hasDelegationTarget,
                      needsPoolChoice: shouldChoosePool,
                      destination,
                      scan: scanActiveAccounts$,
                      buildTxFunction,
                    },
                    dependencies,
                  ),
                ),
              );
            }),
            // Bounds the whole chain from context resolution through the account
            // scan to the reward fetch and dry build, not only context
            // resolution: a slow scan or provider otherwise has no deadline and
            // strands the user on `discovering` with cancelling as the only exit.
            timeout(DISCOVERY_TIMEOUT_MS),
            catchError(error =>
              failure(
                dependencies,
                'migrate-wallet.error.discovery-failed',
                error,
              ),
            ),
            // Last operator, so cancel unsubscribes the whole in-flight chain
            // (sync, account scan, reward fetch, dry build), a late
            // `discoveryCompleted` can't force the abandoned wizard to `review`.
            // The scan's async derive loop cannot be torn down mid-await, but its
            // eventual emission is still dropped, which is what the safety needs.
            takeUntil(actionObservables.migrateWallet.wizardCancelled$),
          ),
      ),
    );
