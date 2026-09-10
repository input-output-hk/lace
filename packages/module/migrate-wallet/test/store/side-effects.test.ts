import { Cardano, Serialization } from '@cardano-sdk/core';
import { AddressType } from '@cardano-sdk/key-management';
import {
  CardanoNetworkId,
  CardanoPaymentAddress,
  CardanoRewardAccount,
  DREP_ALWAYS_ABSTAIN,
  estimateSignedTxSize,
  InputSelectionError,
  InputSelectionFailure,
  SweepCoverageError,
  UtxoCacheKey,
} from '@lace-contract/cardano-context';
import { BlockchainNetworkId } from '@lace-contract/network';
import { AuthenticationCancelledError } from '@lace-contract/signer';
import { AccountId, WalletId, WalletType } from '@lace-contract/wallet-repo';
import { BigNumber, Err, Ok } from '@lace-lib/util';
import { testSideEffect } from '@lace-lib/util-dev';
import {
  BehaviorSubject,
  from,
  NEVER,
  of,
  Subject,
  tap,
  throwError,
} from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import {
  buildSweepTx,
  evaluateSweepability,
  isUnbalanceableSweepError,
} from '../../src/store/helpers';
import {
  makeRunDiscovery,
  makeRunSweep,
  makeTrackWalletCreation,
} from '../../src/store/side-effects';
import { withDeviceHint } from '../../src/store/side-effects/device-hint';
import {
  migrateWalletActions,
  type AccountMappingEntry,
  type MigrateWalletStep,
} from '../../src/store/slice';
import {
  buildCardanoAccount,
  buildCardanoAddressRecord,
} from '../support/cardano-account';

import type { SweepPlan } from '../../src/store/helpers';
import type {
  AccountResolution,
  ActiveAccountScan,
} from '../../src/store/side-effects/scan-active-accounts';
import type { Bip32PublicKeyHex } from '@cardano-sdk/crypto';
import type { GroupedAddress } from '@cardano-sdk/key-management';
import type { AnyAddress } from '@lace-contract/addresses';
import type {
  CardanoAddressData,
  CardanoBip32AccountProps,
  CardanoProvider,
  RequiredProtocolParameters,
  RewardAccountInfo,
} from '@lace-contract/cardano-context';
import type { CreateWalletErrorReason } from '@lace-contract/onboarding-v2';
import type {
  AnyWallet,
  InMemoryWalletAccount,
} from '@lace-contract/wallet-repo';
import type { Observable } from 'rxjs';
import type { RunHelpers } from 'rxjs/testing';
import type { Mock, Mocked } from 'vitest';

const { mockSignWithAccounts } = vi.hoisted(() => ({
  mockSignWithAccounts: vi.fn(),
}));

vi.mock('../../src/store/side-effects/sign-sweep-tx', async importOriginal => ({
  ...(await importOriginal()),
  signWithAccounts: mockSignWithAccounts,
}));

// Full replacement, not importOriginal: the real barrel pulls native sheet
// internals that do not resolve under node. Reached through the side-effects
// barrel via consume-pool-selection.
vi.mock('@lace-lib/navigation', () => ({
  NavigationControls: { closeSheet: vi.fn(), navigate: vi.fn() },
  SheetRoutes: { BrowsePool: 'BrowsePool' },
}));

const mock = <T>(partial: Partial<T>): T => partial as T;

const chainId = Cardano.ChainIds.Mainnet;

const sourceWalletId = WalletId('source-wallet');
const sourceAccountId = AccountId('source-account');
const destinationAccountId = AccountId('destination-account');

const rewardAccount0 = CardanoRewardAccount(
  'stake1uxpdrerp9wrxunfh6ukyv5267j70fzxgw0fr3z8zeac5vyqhf9jhy',
);
/** Where a source account already stakes, for the preservation checks. */
const SOURCE_POOL = Cardano.PoolId(
  'pool106jtt06k5wjpqc5r5fkz06pgwhwaljzs624mnfua8fkhq0fl9am',
);

const rewardAccount1 = CardanoRewardAccount(
  'stake1uyfz49rtntfa9h0s98f6s28sg69weemgjhc4e8hm66d5yacalmqha',
);
const sourceAddress = Cardano.PaymentAddress(
  'addr1q96l79jg5ahsrkfyrprs9eaaek0g0tfg3m4tln0vkmq29m8gnpz7wtsycpytk4tn3fe85fqhw7enll66ud9ex6yeu4wqgwfsph',
);
const destinationAddress = CardanoPaymentAddress(
  'addr1qysyd4huaa8fppt5800gy6vjqacn29ce6vske9yz7mpvckajqlxgz8pdfj4uqfny4f72llspljpmvcx0wdsh8punfjzqwzpctq',
);

const protocolParameters: RequiredProtocolParameters = {
  coinsPerUtxoByte: 4310,
  collateralPercentage: 150,
  desiredNumberOfPools: 500,
  dRepDeposit: 500_000_000,
  maxCollateralInputs: 3,
  maxTxSize: 16384,
  maxValueSize: 5000,
  minFeeCoefficient: 44,
  minFeeConstant: 155381,
  minFeeRefScriptCostPerByte: '15.0',
  monetaryExpansion: '3.0/1000.0',
  poolDeposit: 500_000_000,
  poolInfluence: '3.0/10.0',
  prices: { memory: 0.0577, steps: 0.0000721 },
  stakeKeyDeposit: 2_000_000,
};

const assetId = Cardano.AssetId(
  'b0d07d45fe9514f80213f4020e5a61241458be626841cde717cb38a76e7574636f696e',
);
const assetId2 = Cardano.AssetId(
  'b0d07d45fe9514f80213f4020e5a61241458be626841cde717cb38a76e7574636f6970',
);

const utxoTxId = Cardano.TransactionId(
  '0dc01a6e652d0ca5078d01caab25cc8243850ed6545eff77cda17a2dd0bab60c',
);

const createUtxo = (
  coins: bigint,
  assets?: Map<Cardano.AssetId, bigint>,
  index = 0,
): Cardano.Utxo =>
  [
    { txId: utxoTxId, index },
    { address: sourceAddress, value: { coins, ...(assets && { assets }) } },
  ] as Cardano.Utxo;

const rewardInfo = (
  overrides: Partial<RewardAccountInfo> & {
    rewardAccount: CardanoRewardAccount;
  },
): RewardAccountInfo & { rewardAccount: CardanoRewardAccount } =>
  ({
    isActive: false,
    isRegistered: false,
    rewardsSum: BigNumber(0n),
    withdrawableAmount: BigNumber(0n),
    controlledAmount: BigNumber(0n),
    ...overrides,
  } as RewardAccountInfo & { rewardAccount: CardanoRewardAccount });

const basePlan: SweepPlan = {
  utxos: [createUtxo(5_000_000n), createUtxo(5_000_000n, undefined, 1)],
  rewardInfos: [
    rewardInfo({
      rewardAccount: rewardAccount0,
      isRegistered: true,
      withdrawableAmount: BigNumber(1_500_000n),
    }),
  ],
  protocolParameters,
  networkMagic: chainId.networkMagic,
  destinationAddress,
};

// The set the sweep replays from the reviewed plan (a single account here).
const reviewedSweepPlan = {
  chainId,
  protocolParameters,
  utxos: basePlan.utxos,
  addresses: [
    {
      accountIndex: 0,
      address: sourceAddress,
      index: 0,
      networkId: chainId.networkId,
      rewardAccount: rewardAccount0,
      type: 0,
      stakeKeyDerivationPath: { role: 2, index: 0 },
    },
  ],
  signingAccounts: [
    {
      accountId: sourceAccountId,
      accountIndex: 0,
      extendedAccountPublicKey: 'xpub0',
    },
  ],
} as never;

// Shared by every unbalanceable-source fixture below: the real build fails,
// is classified as permanent (not retryable), and evaluateSweepability
// refuses with cannot-cover-fee once fed that real outcome.
const itRefusesAsUnbalanceable = (
  label: string,
  getPlan: () => SweepPlan,
  getExpectedStuckAmount: () => bigint,
) => {
  it(`rejects with InputSelectionError when it fails to balance (${label})`, async () => {
    await expect(buildSweepTx(getPlan())).rejects.toBeInstanceOf(
      InputSelectionError,
    );
  });

  it(`is classified as an unbalanceable sweep failure (${label})`, async () => {
    const error = await buildSweepTx(getPlan()).catch(
      (thrown: unknown) => thrown,
    );

    expect(isUnbalanceableSweepError(error)).toBe(true);
  });

  it(`evaluateSweepability refuses with cannot-cover-fee, disclosing the stuck amount (${label})`, () => {
    // { built: false } is what the previous test already proved buildSweepTx
    // produces for this plan — no need to rebuild it here.
    const plan = getPlan();
    const verdict = evaluateSweepability(
      { utxos: plan.utxos, rewardInfos: plan.rewardInfos },
      { built: false },
    );

    expect(verdict).toEqual({
      kind: 'refuse',
      errorKey: 'migrate-wallet.error.cannot-cover-fee',
      amount: {
        value: `${getExpectedStuckAmount()}`,
        labelKey: 'migrate-wallet.unsupported.stuck-amount',
      },
    });
  });
};

describe('buildSweepTx', () => {
  it('sweeps every UTxO and withdraws rewards into the destination, leaving the key registered', async () => {
    const body = (await buildSweepTx(basePlan)).toCore().body;

    expect(body.inputs).toHaveLength(2);
    expect(body.outputs).toHaveLength(1);
    expect(body.outputs[0].address).toBe(destinationAddress);
    expect(body.withdrawals).toEqual([
      expect.objectContaining({
        stakeAddress: rewardAccount0,
        quantity: 1_500_000n,
      }),
    ]);
    // No deregistration: the stake key stays registered, so the 2 ADA deposit is
    // NOT reclaimed here (collected later in a follow-up sweep, D2 mechanics 2).
    expect(body.certificates ?? []).toHaveLength(0);
    expect(body.fee).toBeGreaterThan(0n);
    // Inputs + rewards - fee land in the destination; no deposit refund.
    expect(body.outputs[0].value.coins).toBe(
      10_000_000n + 1_500_000n - body.fee,
    );
  });

  // A multi-token, multi-UTxO source through the real builder, mirroring the
  // live proof (token and ADA landing together at the destination) with exact
  // assertions instead of just presence-of-asset.
  describe('multiple token classes ride along', () => {
    const utxoCoins = 5_000_000n;
    const assetQuantity = 42n;
    const assetQuantity2 = 7n;

    it('merges distinct asset classes from separate UTxOs into a single change output', async () => {
      const body = (
        await buildSweepTx({
          ...basePlan,
          utxos: [
            createUtxo(utxoCoins, new Map([[assetId, assetQuantity]]), 0),
            createUtxo(utxoCoins, new Map([[assetId2, assetQuantity2]]), 1),
          ],
          rewardInfos: [rewardInfo({ rewardAccount: rewardAccount0 })],
        })
      ).toCore().body;

      expect(body.outputs).toHaveLength(1);
      expect(body.outputs[0].value.assets?.get(assetId)).toBe(assetQuantity);
      expect(body.outputs[0].value.assets?.get(assetId2)).toBe(assetQuantity2);
      expect(body.outputs[0].value.coins).toBe(utxoCoins * 2n - body.fee);
    });

    it('keeps multiple asset classes from a single UTxO intact alongside a rewards withdrawal', async () => {
      const withdrawableAmount = BigNumber.valueOf(
        basePlan.rewardInfos[0].withdrawableAmount,
      );
      const tokens = new Map([
        [assetId, assetQuantity],
        [assetId2, assetQuantity2],
      ]);
      const body = (
        await buildSweepTx({
          ...basePlan,
          utxos: [createUtxo(utxoCoins, tokens)],
        })
      ).toCore().body;

      expect(body.withdrawals).toEqual([
        expect.objectContaining({
          stakeAddress: rewardAccount0,
          quantity: withdrawableAmount,
        }),
      ]);
      expect(body.outputs).toHaveLength(1);
      expect(body.outputs[0].value.assets?.get(assetId)).toBe(assetQuantity);
      expect(body.outputs[0].value.assets?.get(assetId2)).toBe(assetQuantity2);
      // UTxO coins + reward, minus the actual fee, land in the output.
      expect(body.outputs[0].value.coins).toBe(
        utxoCoins + withdrawableAmount - body.fee,
      );
    });
  });

  it('omits certificates and withdrawals for an unregistered, rewardless source', async () => {
    const body = (
      await buildSweepTx({
        ...basePlan,
        rewardInfos: [rewardInfo({ rewardAccount: rewardAccount0 })],
      })
    ).toCore().body;

    expect(body.certificates ?? []).toHaveLength(0);
    expect(body.withdrawals ?? []).toHaveLength(0);
  });

  // The builder loops per reward account, so a multi-stake-key source is
  // exercised here with exact per-account withdrawal amounts, not just
  // "a withdrawal happened".
  describe('multiple reward accounts (multi-stake-key source)', () => {
    const withdrawableAmount0 = 1_000_000n;
    const withdrawableAmount1 = 2_000_000n;

    it('withdraws only where funds exist across multiple reward accounts, adding no certificates', async () => {
      const body = (
        await buildSweepTx({
          ...basePlan,
          rewardInfos: [
            rewardInfo({
              rewardAccount: rewardAccount0,
              isRegistered: true,
              withdrawableAmount: BigNumber(withdrawableAmount0),
            }),
            rewardInfo({ rewardAccount: rewardAccount1, isRegistered: true }),
          ],
        })
      ).toCore().body;

      expect(body.certificates ?? []).toHaveLength(0);
      expect(body.withdrawals).toHaveLength(1);
      expect(body.withdrawals?.[0].stakeAddress).toBe(rewardAccount0);
    });

    it('withdraws every funded account when multiple reward accounts have nonzero rewards', async () => {
      const body = (
        await buildSweepTx({
          ...basePlan,
          rewardInfos: [
            rewardInfo({
              rewardAccount: rewardAccount0,
              isRegistered: true,
              withdrawableAmount: BigNumber(withdrawableAmount0),
            }),
            rewardInfo({
              rewardAccount: rewardAccount1,
              isRegistered: true,
              withdrawableAmount: BigNumber(withdrawableAmount1),
            }),
          ],
        })
      ).toCore().body;

      expect(body.certificates ?? []).toHaveLength(0);
      expect(body.withdrawals).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            stakeAddress: rewardAccount0,
            quantity: withdrawableAmount0,
          }),
          expect.objectContaining({
            stakeAddress: rewardAccount1,
            quantity: withdrawableAmount1,
          }),
        ]),
      );
      expect(body.withdrawals).toHaveLength(2);
      // Inputs + both rewards - fee land in the destination.
      const basePlanUtxoCoins = basePlan.utxos.reduce(
        (sum: bigint, [, txOut]: Cardano.Utxo) => sum + txOut.value.coins,
        0n,
      );
      expect(body.outputs[0].value.coins).toBe(
        basePlanUtxoCoins +
          withdrawableAmount0 +
          withdrawableAmount1 -
          body.fee,
      );
    });

    it('withdraws from multiple funded reward accounts alongside native tokens', async () => {
      const utxoCoins = 5_000_000n;
      const assetQuantity = 10n;
      const tokens = new Map([[assetId, assetQuantity]]);
      const body = (
        await buildSweepTx({
          ...basePlan,
          utxos: [createUtxo(utxoCoins, tokens)],
          rewardInfos: [
            rewardInfo({
              rewardAccount: rewardAccount0,
              isRegistered: true,
              withdrawableAmount: BigNumber(withdrawableAmount0),
            }),
            rewardInfo({
              rewardAccount: rewardAccount1,
              isRegistered: true,
              withdrawableAmount: BigNumber(withdrawableAmount1),
            }),
          ],
        })
      ).toCore().body;

      expect(body.withdrawals).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            stakeAddress: rewardAccount0,
            quantity: withdrawableAmount0,
          }),
          expect.objectContaining({
            stakeAddress: rewardAccount1,
            quantity: withdrawableAmount1,
          }),
        ]),
      );
      expect(body.withdrawals).toHaveLength(2);
      expect(body.outputs[0].value.assets?.get(assetId)).toBe(assetQuantity);
      // Single UTxO's coins + both rewards - fee, proving the token bundle
      // doesn't disturb the multi-account withdrawal math.
      expect(body.outputs[0].value.coins).toBe(
        utxoCoins + withdrawableAmount0 + withdrawableAmount1 - body.fee,
      );
    });
  });

  // Runs the real buildSweepTx and evaluateSweepability (not mocks), so a
  // regression in either one would surface here.
  describe('token-heavy, ADA-poor source', () => {
    const utxoCoins = 1_200_000n;
    const adaPoorPlan = {
      ...basePlan,
      utxos: [createUtxo(utxoCoins, new Map([[assetId, 999n]]))],
      rewardInfos: [rewardInfo({ rewardAccount: rewardAccount0 })],
    };

    // Proves the token's own min-UTxO requirement, not "too little ADA", is
    // what tips this fixture into InputSelectionError: the same UTxO amount
    // balances fine on its own.
    it('balances at this UTxO amount when no token is attached', async () => {
      await expect(
        buildSweepTx({
          ...basePlan,
          utxos: [createUtxo(utxoCoins)],
          rewardInfos: [rewardInfo({ rewardAccount: rewardAccount0 })],
        }),
      ).resolves.toBeDefined();
    });

    itRefusesAsUnbalanceable(
      'token-heavy',
      () => adaPoorPlan,
      () => utxoCoins,
    );
  });

  // Runs the real buildSweepTx and evaluateSweepability (not mocks), so a
  // regression in either one would surface here.
  describe('ADA-poor source, value locked in a withdrawable reward', () => {
    const utxoCoins = 50_000n;
    const withdrawableAmount = 50_000n;
    const adaPoorPlan = {
      ...basePlan,
      utxos: [createUtxo(utxoCoins)],
      rewardInfos: [
        rewardInfo({
          rewardAccount: rewardAccount0,
          // A reward account can only hold a withdrawable balance once
          // registered.
          isRegistered: true,
          // Vote-delegated (any DRep passes), so this doesn't also trip the
          // higher-priority rewards-not-vote-delegated refusal.
          drepId: DREP_ALWAYS_ABSTAIN,
          withdrawableAmount: BigNumber(withdrawableAmount),
        }),
      ],
    };

    itRefusesAsUnbalanceable(
      'locked reward',
      () => adaPoorPlan,
      // The stake deposit is not part of the figure: the sweep never claims it
      // (no deregistration certificate, FR-5), so it is stuck either way and
      // counting it would overstate what the fee shortfall is holding up.
      () => utxoCoins + withdrawableAmount,
    );
  });

  it('adds no certificates for a withdrawing source: no deregistration, no vote-delegation (S8)', async () => {
    // The key is left registered (no deregistration cert). And a same-tx
    // VoteDelegation cannot authorise this tx's own withdrawal anyway
    // (ConwayWdrlNotDelegatedToDRep checks the pre-certificate state), so the
    // builder adds neither. See docs/sweep-corner-cases.md S8.
    const body = (
      await buildSweepTx({
        ...basePlan,
        rewardInfos: [
          rewardInfo({
            rewardAccount: rewardAccount0,
            isRegistered: true,
            withdrawableAmount: BigNumber(1_500_000n),
            // drepId absent → never vote-delegated
          }),
        ],
      })
    ).toCore().body;

    expect(body.certificates ?? []).toHaveLength(0);
    expect(body.withdrawals).toHaveLength(1);
  });
});

describe('estimateSignedTxSize (case 1 over-size detection)', () => {
  it('counts the witnesses (signed size exceeds the unsigned CBOR)', async () => {
    const tx = await buildSweepTx(basePlan);
    const unsignedBytes = tx.toCbor().length / 2;
    // At least one input payment key plus the withdrawal stake key are signed.
    expect(estimateSignedTxSize(tx, basePlan.utxos)).toBeGreaterThan(
      unsignedBytes,
    );
  });

  it('is under the cap for a normal sweep', async () => {
    const tx = await buildSweepTx(basePlan);
    expect(estimateSignedTxSize(tx, basePlan.utxos)).toBeLessThanOrEqual(
      protocolParameters.maxTxSize,
    );
  });

  // The over-cap case on a real many-UTxO build is exercised end-to-end by the
  // makeRunDiscovery "exceeds the tx size cap (case 1)" marble, which refuses
  // only if estimateSignedTxSize reports the built 500-input tx over the cap.
});

const createSourceAccount =
  (): InMemoryWalletAccount<CardanoBip32AccountProps> =>
    buildCardanoAccount({
      accountId: sourceAccountId,
      walletId: sourceWalletId,
      accountIndex: 0,
      chainId,
      extendedAccountPublicKey:
        'xpub1234' as CardanoBip32AccountProps['extendedAccountPublicKey'],
      blockchainNetworkId: BlockchainNetworkId('cardano-mainnet'),
      networkType: 'mainnet',
    });

const createSourceWallet = (): AnyWallet =>
  mock<AnyWallet>({
    walletId: sourceWalletId,
    type: 'InMemory',
    accounts: [createSourceAccount()],
  } as Partial<AnyWallet>);

const cardanoAddress = (
  accountId: AccountId,
  address: string,
  networkId: Cardano.NetworkId,
): AnyAddress<CardanoAddressData> =>
  buildCardanoAddressRecord({
    accountId,
    address,
    data: {
      rewardAccount: rewardAccount0,
      stakeKeyDerivationPath: { index: 0, role: 2 },
      accountIndex: 0,
      index: 0,
      networkId,
      type: AddressType.External,
      networkMagic: chainId.networkMagic,
    },
  });

// Cast: the harness expects the app-wide ActionCreators map; the suite only
// exercises migrateWallet.* and activities.upsertActivities.
const actions = {
  ...migrateWalletActions,
  activities: {
    upsertActivities: vi.fn((payload: unknown) => ({
      type: 'activities/upsertActivities',
      payload,
    })),
  },
  wallets: {
    updateWallet: vi.fn((payload: unknown) => ({
      type: 'wallets/updateWallet',
      payload,
    })),
  },
  accountManagement: {
    attemptCreateHardwareWallet: vi.fn((payload: unknown) => ({
      type: 'accountManagement/attemptCreateHardwareWallet',
      payload,
    })),
  },
} as never;

// Typed accessor for the shared upsertActivities mock: `actions` above is cast
// to `never` for the harness, so tests asserting on the mock need this to get
// past the type checker.
const upsertActivitiesMock = (
  actions as unknown as {
    activities: { upsertActivities: Mock };
  }
).activities.upsertActivities;

describe('makeRunSweep', () => {
  const sweepStartedMarble = (
    hot: Parameters<Parameters<typeof testSideEffect>[1]>[0]['hot'],
  ) => ({
    migrateWallet: {
      sweepStarted$: hot('-a', {
        a: migrateWalletActions.migrateWallet.sweepStarted(),
      }),
      sweepRetryRequested$: hot('--') as never,
    },
  });

  // The wizard-id selectors feed withLatestFrom (subscribed at init → hot,
  // emitting before the trigger). Everything consumed inside the per-sweep
  // inner pipeline subscribes AFTER the trigger fires, so those must be cold
  // to be seen at all (see docs/rxjs-guidelines.md).
  const stateFor = (
    { hot, cold }: { hot: RunHelpers['hot']; cold: RunHelpers['cold'] },
    { destinationNetworkId = chainId.networkId } = {},
  ) => ({
    migrateWallet: {
      selectSourceWalletId$: hot('a', { a: sourceWalletId }),
      selectSourceAccountId$: hot('a', { a: sourceAccountId }),
      selectDestinationAccountId$: hot('a', { a: destinationAccountId }),
      // Phrase-sourced by default: no captured device, so discovery scans via
      // the encrypted root.
      selectPendingHwSource$: hot('a', { a: undefined }),
      // The sweep resolves its source context from the reviewed plan. Cold: read
      // inside the per-sweep pipeline, subscribed after the trigger fires.
      selectReviewedSweepPlan$: cold('a', { a: reviewedSweepPlan }),
      selectSweepProgress$: hot('a', { a: undefined }),
      // Legacy (pre-mapping) runs by default: no mode, no plan — the sweep
      // keeps the picked account and the single sweep-wide target.
      selectDestinationWalletId$: hot('a', { a: undefined }),
      selectMigrationMode$: hot('a', { a: undefined }),
      selectAccountMapping$: hot('a', { a: undefined }),
      selectPendingHwDestinationDevice$: hot('a', { a: undefined }),
      selectResolvedDestinationIndexes$: hot('a', { a: undefined }),
    },
    addresses: {
      selectByAccountId$: cold('a', {
        a: (accountId: AccountId) =>
          accountId === destinationAccountId
            ? [
                cardanoAddress(
                  destinationAccountId,
                  destinationAddress,
                  destinationNetworkId,
                ),
              ]
            : [
                cardanoAddress(
                  sourceAccountId,
                  sourceAddress,
                  chainId.networkId,
                ),
              ],
      }),
    },
    wallets: {
      selectWalletById$: cold('a', { a: () => createSourceWallet() }),
      selectAll$: hot('a', { a: [] }),
    },
    cardanoContext: {
      selectAvailableAccountUtxos$: cold('a', {
        a: { [sourceAccountId]: basePlan.utxos },
      }),
      // Coherent with the one source address above: the context gate accepts
      // a UTxO set only when its fetch covered the current address set.
      selectLastFetchedUtxoCacheKeyByAccount$: cold('a', {
        a: {
          [sourceAccountId]: UtxoCacheKey({
            topOnChainActivityId: 'tx0',
            stakeKeys: [],
            accountAddressCount: 1,
          }),
        },
      }),
      selectAllNetworkInfo$: cold('a', {
        a: {
          [BlockchainNetworkId('cardano-mainnet')]: { protocolParameters },
        },
      }),
    },
  });

  const createDependencies = () => ({
    logger: {
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
      trace: vi.fn(),
    },
    cardanoProvider: {
      getAccountUtxos: vi.fn().mockReturnValue(of(Ok([]))),
      getRewardAccountInfo: vi.fn().mockReturnValue(
        of(
          Ok({
            isActive: false,
            isRegistered: false,
            rewardsSum: BigNumber(0n),
            withdrawableAmount: BigNumber(0n),
            controlledAmount: BigNumber(0n),
          }),
        ),
      ),
      submitTx: vi
        .fn()
        .mockReturnValue(of(Ok('txid123' as unknown as Cardano.TransactionId))),
    } as unknown as Mocked<CardanoProvider>,
    actions,
  });

  // Returns a single-chunk plan synchronously. Tests that don't exercise
  // multi-chunk chunking inject this to avoid the async chunkSweepPlan which
  // breaks TestScheduler virtual time.
  const singleChunkPlan: NonNullable<
    Parameters<typeof makeRunSweep>[0]
  >['computeChunkPlans'] = ({ utxos, rewardInfos }) =>
    of([{ index: 0, utxos, rewardInfos, isLastChunk: true }]);

  it('fails immediately when wizard state is missing ids', () => {
    testSideEffect(
      makeRunSweep({ computeChunkPlans: singleChunkPlan }),
      ({ hot, expectObservable }) => ({
        actionObservables: sweepStartedMarble(hot),
        stateObservables: {
          migrateWallet: {
            selectSourceWalletId$: hot('a', { a: undefined }),
            selectSourceAccountId$: hot('a', { a: undefined }),
            selectDestinationAccountId$: hot('a', { a: undefined }),
            selectSweepProgress$: hot('a', { a: undefined }),
            selectDestinationWalletId$: hot('a', { a: undefined }),
            selectMigrationMode$: hot('a', { a: undefined }),
            selectAccountMapping$: hot('a', { a: undefined }),
            selectPendingHwDestinationDevice$: hot('a', { a: undefined }),
            selectResolvedDestinationIndexes$: hot('a', { a: undefined }),
          },
          wallets: { selectAll$: hot('a', { a: [] }) },
          addresses: { selectByAccountId$: hot('a', { a: () => [] }) },
        },
        dependencies: createDependencies(),
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('-a', {
            a: migrateWalletActions.migrateWallet.stepFailed({
              errorKey: 'migrate-wallet.error.sweep-failed',
            }),
          });
        },
      }),
    );
  });

  it('rejects a destination on a different network before signing (SR-15)', () => {
    const signTxFunction = vi.fn();
    testSideEffect(
      makeRunSweep({ signTxFunction, computeChunkPlans: singleChunkPlan }),
      ({ hot, cold, expectObservable }) => ({
        actionObservables: sweepStartedMarble(hot),
        stateObservables: stateFor(
          { hot, cold },
          {
            destinationNetworkId: Cardano.NetworkId.Testnet,
          },
        ),
        dependencies: createDependencies(),
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('-a', {
            a: migrateWalletActions.migrateWallet.stepFailed({
              errorKey: 'migrate-wallet.error.network-mismatch',
            }),
          });
        },
      }),
    );
    expect(signTxFunction).not.toHaveBeenCalled();
  });

  describe('preserve mode destination plan', () => {
    const destinationWalletId = WalletId('destination-wallet');
    // Real id, not 'cardano-mainnet': the network guard resolves it to a chain
    // id, and an unparsable one now refuses the sweep.
    const destinationNetwork = CardanoNetworkId(chainId.networkMagic);
    const landingAccountId = AccountId('destination-account-1');

    /** Hardware: no encrypted root, so accounts can only come from a device. */
    const hardwareDestination = (loadedIndexes: number[]) =>
      mock<AnyWallet>({
        walletId: destinationWalletId,
        type: WalletType.HardwareLedger,
        accounts: loadedIndexes.map(accountIndex => ({
          accountId:
            accountIndex === 0 ? destinationAccountId : landingAccountId,
          blockchainName: 'Cardano',
          blockchainNetworkId: destinationNetwork,
          blockchainSpecific: { accountIndex } as CardanoBip32AccountProps,
        })),
      } as unknown as Partial<AnyWallet>);

    /** One funded source account, planned to land on its own account #1. */
    const mapping = [
      {
        sourceAccountIndex: 0,
        destinationAccountIndex: 1,
        coin: '10000000',
        assetCount: 0,
        utxoCount: 1,
      },
    ];

    const preserveState = (
      { hot, cold }: { hot: RunHelpers['hot']; cold: RunHelpers['cold'] },
      destinationWallet: AnyWallet,
    ) => {
      const base = stateFor({ hot, cold });
      return {
        ...base,
        migrateWallet: {
          ...base.migrateWallet,
          // A resume: the first attempt moved nothing but did persist whatever
          // accounts it created.
          selectSweepProgress$: hot('a', { a: undefined }),
          selectDestinationWalletId$: hot('a', { a: destinationWalletId }),
          selectMigrationMode$: hot('a', { a: 'preserve' as const }),
          selectAccountMapping$: hot('a', { a: mapping }),
          // The device the user connected at the mode choice is gone — the
          // wizard was reopened, or the browser dropped the handle.
          selectPendingHwDestinationDevice$: hot('a', { a: undefined }),
          selectResolvedDestinationIndexes$: hot('a', { a: undefined }),
        },
        addresses: {
          selectByAccountId$: cold('a', {
            a: (accountId: AccountId) =>
              accountId === sourceAccountId
                ? [
                    cardanoAddress(
                      sourceAccountId,
                      sourceAddress,
                      chainId.networkId,
                    ),
                  ]
                : [
                    cardanoAddress(
                      accountId,
                      destinationAddress,
                      chainId.networkId,
                    ),
                  ],
          }),
        },
        wallets: {
          ...base.wallets,
          selectAll$: hot('a', {
            a: [createSourceWallet(), destinationWallet],
          }),
        },
      };
    };

    /**
     * The degradation this refuses: with the device gone, `canCreateAccounts`
     * flipped false, the planned indexes were dropped, and the sweep fell back
     * to the single picked account — co-spending every source account into it
     * and linking exactly what the user chose preserve mode to keep apart. It
     * did so silently, after the review promised otherwise.
     */
    it('refuses a preserve run that needs accounts it can no longer create', () => {
      const signTxFunction = vi.fn();
      testSideEffect(
        makeRunSweep({ signTxFunction, computeChunkPlans: singleChunkPlan }),
        ({ hot, cold, expectObservable }) => ({
          actionObservables: sweepStartedMarble(hot),
          // Account #1 was never created, and there is no device to create it.
          stateObservables: preserveState(
            { hot, cold },
            hardwareDestination([0]),
          ),
          dependencies: createDependencies(),
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-a', {
              a: migrateWalletActions.migrateWallet.stepFailed({
                errorKey: 'migrate-wallet.error.destination-device-required',
              }),
            });
          },
        }),
      );
      expect(signTxFunction).not.toHaveBeenCalled();
    });

    /**
     * The other half of the same finding: the device is only needed to CREATE
     * accounts, and a resume whose first attempt already persisted them needs
     * nothing created. Asking for it back there would be a dead end — nothing
     * the user could reconnect would change the outcome.
     */
    // Real timers, not marbles: the prepared path resolves through a promise,
    // which virtual time never settles.
    it('resumes without the device when every planned account already exists', async () => {
      const destinationWallet = hardwareDestination([0, 1]);
      const sideEffect = makeRunSweep({
        resolveSourceContext: () =>
          of({
            wallet: createSourceWallet(),
            chainId,
            protocolParameters,
            utxos: basePlan.utxos,
            addresses: [
              {
                accountIndex: 0,
                address: sourceAddress,
                index: 0,
                networkId: chainId.networkId,
                rewardAccount: Cardano.RewardAccount(rewardAccount0),
                type: AddressType.External,
                stakeKeyDerivationPath: { role: 2, index: 0 },
              } as unknown as GroupedAddress,
            ],
            signingAccounts: [
              {
                accountId: sourceAccountId,
                accountIndex: 0,
                extendedAccountPublicKey: 'xpub0' as Bip32PublicKeyHex,
              },
            ],
          }),
        computeChunkPlans: singleChunkPlan,
      });

      const stateObs = {
        migrateWallet: {
          selectSourceWalletId$: of(sourceWalletId),
          selectSourceAccountId$: of(sourceAccountId),
          selectDestinationAccountId$: of(destinationAccountId),
          selectSweepProgress$: of(undefined),
          selectDestinationWalletId$: of(destinationWalletId),
          selectMigrationMode$: of('preserve'),
          selectAccountMapping$: of(mapping),
          selectPendingHwDestinationDevice$: of(undefined),
          selectResolvedDestinationIndexes$: of(undefined),
        },
        addresses: {
          selectByAccountId$: of((accountId: AccountId) =>
            accountId === sourceAccountId
              ? [
                  cardanoAddress(
                    sourceAccountId,
                    sourceAddress,
                    chainId.networkId,
                  ),
                ]
              : [
                  cardanoAddress(
                    accountId,
                    destinationAddress,
                    chainId.networkId,
                  ),
                ],
          ),
        },
        wallets: {
          selectAll$: of([createSourceWallet(), destinationWallet]),
          selectWalletById$: of(() => createSourceWallet()),
        },
      };

      const emissions: { type: string; payload?: unknown }[] = [];
      const trigger = new Subject<
        ReturnType<typeof migrateWalletActions.migrateWallet.sweepStarted>
      >();
      const sub = sideEffect(
        {
          migrateWallet: {
            sweepStarted$: trigger.asObservable(),
            sweepRetryRequested$: NEVER,
          },
        } as never,
        stateObs as never,
        createDependencies() as never,
      ).subscribe(action => emissions.push(action));

      trigger.next(migrateWalletActions.migrateWallet.sweepStarted());
      // 2000ms like the other real-timer tests here: the prepared path is
      // promise-driven, and a tighter budget flakes under CI's parallel load.
      await new Promise(resolve => setTimeout(resolve, 2000));
      sub.unsubscribe();

      // Repointed onto account #1 with no device present. Reaching this at all
      // is the assertion: the refusal above and this share one condition, and
      // getting it wrong either way is a dead end for the user — a reconnect
      // prompt nothing can satisfy, or a silent co-spend.
      expect(
        emissions.find(
          ({ type }) => type === 'migrateWallet/destinationAccountsPrepared',
        )?.payload,
      ).toEqual({
        accounts: [{ destinationAccountIndex: 1, accountId: landingAccountId }],
      });
      // The run goes on to fail on signing, which this test does not wire up.
      // What it must never do is refuse for a device it does not need.
      expect(
        emissions.map(
          ({ payload }) => (payload as { errorKey?: string })?.errorKey,
        ),
      ).not.toContain('migrate-wallet.error.destination-device-required');
    });
  });

  it('builds, signs, submits, and reports success with the tx id', async () => {
    const signTxFunction = vi.fn(
      (_source: unknown, tx: Serialization.Transaction) => of(tx),
    );
    const dependencies = createDependencies();
    // buildSweepTx returns a Promise, which never resolves under the
    // TestScheduler's virtual time. Pre-build the real tx here so the injected
    // builder emits it synchronously.
    const prebuiltTx = await buildSweepTx(basePlan);

    testSideEffect(
      makeRunSweep({
        buildTxFunction: () => of(prebuiltTx),
        signTxFunction,
        assertFullySigned: () => {},
        computeChunkPlans: singleChunkPlan,
      }),
      ({ hot, cold, flush }) => ({
        actionObservables: sweepStartedMarble(hot),
        stateObservables: stateFor({ hot, cold }),
        dependencies,
        assertion: sideEffect$ => {
          const emissions: { type: string }[] = [];
          sideEffect$.subscribe(action => emissions.push(action));
          flush();

          expect(dependencies.cardanoProvider.submitTx).toHaveBeenCalledTimes(
            1,
          );
          const types = emissions.map(({ type }) => type);
          expect(types).toContain('migrateWallet/sweepSucceeded');
          const succeeded = emissions.find(
            ({ type }) => type === 'migrateWallet/sweepSucceeded',
          ) as unknown as {
            payload: { txId: string; fee?: bigint; withdrawnRewards?: bigint };
          };
          expect(succeeded.payload.txId).toBe('txid123');

          // The reported figures come from the SIGNED tx body, not the review
          // forecast — the whole reason the payload carries them.
          const body = prebuiltTx.toCore().body;
          expect(succeeded.payload.fee).toBe(body.fee);
          expect(succeeded.payload.withdrawnRewards).toBe(
            (body.withdrawals ?? []).reduce((sum, w) => sum + w.quantity, 0n),
          );
        },
      }),
    );
  });

  it('classifies a dismissed prompt on the single-tx path as cancelled, not failed', async () => {
    // signSweepTx propagates AuthenticationCancelledError when the user
    // dismisses the prompt. Chunking is the exception, so this is the common
    // path — without its own classification the dismissal reads as a failed
    // sweep with "Try again" for a plan where nothing was signed.
    const dependencies = createDependencies();
    const prebuiltTx = await buildSweepTx(basePlan);

    testSideEffect(
      makeRunSweep({
        buildTxFunction: () => of(prebuiltTx),
        signTxFunction: () =>
          throwError(() => new AuthenticationCancelledError()),
        assertFullySigned: () => {},
        computeChunkPlans: singleChunkPlan,
      }),
      ({ hot, cold, flush }) => ({
        actionObservables: sweepStartedMarble(hot),
        stateObservables: stateFor({ hot, cold }),
        dependencies,
        assertion: sideEffect$ => {
          const emissions: { type: string }[] = [];
          sideEffect$.subscribe(action => emissions.push(action));
          flush();

          const types = emissions.map(({ type }) => type);
          expect(types).toContain('migrateWallet/sweepAuthCancelled');
          expect(types).not.toContain('migrateWallet/stepFailed');
          expect(dependencies.cardanoProvider.submitTx).not.toHaveBeenCalled();
        },
      }),
    );
  });

  it('carries the device guidance when the source device stopped the signing', async () => {
    // Without it the screen reads "the sweep transaction failed… you can retry",
    // which is true and useless: the retry fails identically until the Cardano
    // app is opened, and nothing on screen says so.
    const dependencies = createDependencies();
    const prebuiltTx = await buildSweepTx(basePlan);

    testSideEffect(
      makeRunSweep({
        buildTxFunction: () => of(prebuiltTx),
        signTxFunction: () =>
          throwError(() =>
            withDeviceHint(
              new Error('Cannot communicate with Ledger Cardano App'),
            ),
          ),
        assertFullySigned: () => {},
        computeChunkPlans: singleChunkPlan,
      }),
      ({ hot, cold, flush }) => ({
        actionObservables: sweepStartedMarble(hot),
        stateObservables: stateFor({ hot, cold }),
        dependencies,
        assertion: sideEffect$ => {
          const emissions: { type: string; payload?: unknown }[] = [];
          sideEffect$.subscribe(action => emissions.push(action));
          flush();

          const failed = emissions.find(
            ({ type }) => type === 'migrateWallet/stepFailed',
          );
          expect(failed?.payload).toEqual({
            errorKey: 'migrate-wallet.error.sweep-failed',
            deviceHintKey: 'hw-error.app-not-open.subtitle',
          });
        },
      }),
    );
  });

  it('[cov upsert] upserts a pending activity on both the destination and the source account', async () => {
    const signTxFunction = vi.fn(
      (_source: unknown, tx: Serialization.Transaction) => of(tx),
    );
    const dependencies = createDependencies();
    const prebuiltTx = await buildSweepTx(basePlan);
    upsertActivitiesMock.mockClear();

    testSideEffect(
      makeRunSweep({
        buildTxFunction: () => of(prebuiltTx),
        signTxFunction,
        assertFullySigned: () => {},
        computeChunkPlans: singleChunkPlan,
      }),
      ({ hot, cold, flush }) => ({
        actionObservables: sweepStartedMarble(hot),
        stateObservables: stateFor({ hot, cold }),
        dependencies,
        assertion: sideEffect$ => {
          sideEffect$.subscribe();
          flush();

          expect(upsertActivitiesMock).toHaveBeenCalledTimes(2);
          expect(upsertActivitiesMock).toHaveBeenCalledWith(
            expect.objectContaining({
              accountId: destinationAccountId,
              activities: [
                expect.objectContaining({ accountId: destinationAccountId }),
              ],
            }),
          );
          // The spend, on the account that paid it. Without this the old wallet
          // keeps showing the balance it no longer has and keeps offering the
          // swept UTxOs to input selection — `selectAvailableAccountUtxos`
          // subtracts a pending activity's consumed inputs, and there was none.
          expect(upsertActivitiesMock).toHaveBeenCalledWith(
            expect.objectContaining({
              accountId: sourceAccountId,
              activities: [
                expect.objectContaining({ accountId: sourceAccountId }),
              ],
            }),
          );
        },
      }),
    );
  });

  it('[cov submit-err] emits a sweep-failed action without succeeding when submission returns a provider error', async () => {
    const signTxFunction = vi.fn(
      (_source: unknown, tx: Serialization.Transaction) => of(tx),
    );
    const dependencies = createDependencies();
    const prebuiltTx = await buildSweepTx(basePlan);
    dependencies.cardanoProvider.submitTx = vi
      .fn()
      .mockReturnValue(of(Err(new Error('submit failed'))));
    upsertActivitiesMock.mockClear();

    testSideEffect(
      makeRunSweep({
        buildTxFunction: () => of(prebuiltTx),
        signTxFunction,
        assertFullySigned: () => {},
        computeChunkPlans: singleChunkPlan,
      }),
      ({ hot, cold, flush }) => ({
        actionObservables: sweepStartedMarble(hot),
        stateObservables: stateFor({ hot, cold }),
        dependencies,
        assertion: sideEffect$ => {
          const emissions: { type: string }[] = [];
          sideEffect$.subscribe(action => emissions.push(action));
          flush();

          const types = emissions.map(({ type }) => type);
          expect(types).not.toContain('migrateWallet/sweepSucceeded');
          const failed = emissions.find(
            ({ type }) => type === 'migrateWallet/stepFailed',
          ) as unknown as { payload: { errorKey: string } } | undefined;
          expect(failed?.payload.errorKey).toBe(
            'migrate-wallet.error.sweep-failed',
          );
          expect(upsertActivitiesMock).not.toHaveBeenCalled();
        },
      }),
    );
  });

  it('[cov sweep-retry] runs a full build/sign/submit when triggered only by a retry request', async () => {
    const signTxFunction = vi.fn(
      (_source: unknown, tx: Serialization.Transaction) => of(tx),
    );
    const dependencies = createDependencies();
    const prebuiltTx = await buildSweepTx(basePlan);

    testSideEffect(
      makeRunSweep({
        buildTxFunction: () => of(prebuiltTx),
        signTxFunction,
        assertFullySigned: () => {},
        computeChunkPlans: singleChunkPlan,
      }),
      ({ hot, cold, flush }) => ({
        actionObservables: {
          migrateWallet: {
            sweepStarted$: hot('--') as never,
            sweepRetryRequested$: hot('-a', {
              a: migrateWalletActions.migrateWallet.sweepRetryRequested(),
            }),
          },
        },
        stateObservables: stateFor({ hot, cold }),
        dependencies,
        assertion: sideEffect$ => {
          const emissions: { type: string }[] = [];
          sideEffect$.subscribe(action => emissions.push(action));
          flush();

          expect(dependencies.cardanoProvider.submitTx).toHaveBeenCalledTimes(
            1,
          );
          expect(emissions.map(({ type }) => type)).toContain(
            'migrateWallet/sweepSucceeded',
          );
        },
      }),
    );
  });

  it('ignores a second sweep trigger while one is in flight (exhaustMap)', async () => {
    const signTxFunction = vi.fn(
      (_source: unknown, tx: Serialization.Transaction) => of(tx),
    );
    const dependencies = createDependencies();
    const prebuiltTx = await buildSweepTx(basePlan);

    testSideEffect(
      makeRunSweep({
        buildTxFunction: () => of(prebuiltTx),
        signTxFunction,
        assertFullySigned: () => {},
        computeChunkPlans: singleChunkPlan,
      }),
      ({ hot, cold, flush }) => {
        // Keep the first sweep in flight past the second trigger: submission
        // resolves at frame 5, the retrigger fires at frame 2.
        dependencies.cardanoProvider.submitTx = vi.fn().mockReturnValue(
          cold('-----(a|)', {
            a: Ok('txid123' as unknown as Cardano.TransactionId),
          }),
        );
        return {
          actionObservables: {
            migrateWallet: {
              sweepStarted$: hot('-a-a', {
                a: migrateWalletActions.migrateWallet.sweepStarted(),
              }),
              sweepRetryRequested$: hot('----') as never,
            },
          },
          stateObservables: stateFor({ hot, cold }),
          dependencies,
          assertion: sideEffect$ => {
            sideEffect$.subscribe();
            flush();
            expect(dependencies.cardanoProvider.submitTx).toHaveBeenCalledTimes(
              1,
            );
          },
        };
      },
    );
  });

  it('fails closed without submitting when the signed sweep is under-signed', async () => {
    const signTxFunction = vi.fn(
      (_source: unknown, tx: Serialization.Transaction) => of(tx),
    );
    const dependencies = createDependencies();
    const prebuiltTx = await buildSweepTx(basePlan);

    testSideEffect(
      makeRunSweep({
        buildTxFunction: () => of(prebuiltTx),
        signTxFunction,
        assertFullySigned: () => {
          throw new Error('missing witness');
        },
        computeChunkPlans: singleChunkPlan,
      }),
      ({ hot, cold, flush }) => ({
        actionObservables: sweepStartedMarble(hot),
        stateObservables: stateFor({ hot, cold }),
        dependencies,
        assertion: sideEffect$ => {
          const emissions: { type: string }[] = [];
          sideEffect$.subscribe(action => emissions.push(action));
          flush();

          expect(dependencies.cardanoProvider.submitTx).not.toHaveBeenCalled();
          expect(emissions.map(({ type }) => type)).toContain(
            'migrateWallet/stepFailed',
          );
        },
      }),
    );
  });

  it('fails closed without submitting when the built sweep omits a pinned utxo or withdrawal', async () => {
    const signTxFunction = vi.fn(
      (_source: unknown, tx: Serialization.Transaction) => of(tx),
    );
    const dependencies = createDependencies();
    const prebuiltTx = await buildSweepTx(basePlan);

    testSideEffect(
      makeRunSweep({
        buildTxFunction: () => of(prebuiltTx),
        signTxFunction,
        assertFullySigned: () => {},
        assertCoversPinnedSet: () => {
          throw new SweepCoverageError(['tx#0'], []);
        },
        computeChunkPlans: singleChunkPlan,
      }),
      ({ hot, cold, flush }) => ({
        actionObservables: sweepStartedMarble(hot),
        stateObservables: stateFor({ hot, cold }),
        dependencies,
        assertion: sideEffect$ => {
          const emissions: { type: string }[] = [];
          sideEffect$.subscribe(action => emissions.push(action));
          flush();

          expect(dependencies.cardanoProvider.submitTx).not.toHaveBeenCalled();
          expect(emissions.map(({ type }) => type)).toContain(
            'migrateWallet/stepFailed',
          );
        },
      }),
    );
  });

  it('fails closed without submitting when the built sweep omits a pinned reward withdrawal', async () => {
    const signTxFunction = vi.fn(
      (_source: unknown, tx: Serialization.Transaction) => of(tx),
    );
    const dependencies = createDependencies();
    // A non-zero withdrawable balance so the withdrawal half of the pinned set
    // computed in run-sweep is non-empty, not the all-tests-return-0n default.
    // Placeholder-delegated (DREP_ALWAYS_ABSTAIN) so the sweep-time eligibility
    // re-check passes and the built tx reaches the coverage guard, which is what
    // this test exercises.
    dependencies.cardanoProvider.getRewardAccountInfo = vi.fn().mockReturnValue(
      of(
        Ok({
          isActive: true,
          isRegistered: true,
          drepId: DREP_ALWAYS_ABSTAIN,
          rewardsSum: BigNumber(1_500_000n),
          withdrawableAmount: BigNumber(1_500_000n),
          controlledAmount: BigNumber(1_500_000n),
        }),
      ),
    );
    // Spends the pinned utxos, but built as a rewardless sweep, so it carries
    // no withdrawal for the guard (using the real assertCoversPinnedSet) to catch.
    const prebuiltTx = await buildSweepTx({
      ...basePlan,
      rewardInfos: [rewardInfo({ rewardAccount: rewardAccount0 })],
    });

    testSideEffect(
      makeRunSweep({
        buildTxFunction: () => of(prebuiltTx),
        signTxFunction,
        computeChunkPlans: singleChunkPlan,
      }),
      ({ hot, cold, flush }) => ({
        actionObservables: sweepStartedMarble(hot),
        stateObservables: stateFor({ hot, cold }),
        dependencies,
        assertion: sideEffect$ => {
          const emissions: { type: string }[] = [];
          sideEffect$.subscribe(action => emissions.push(action));
          flush();

          expect(dependencies.cardanoProvider.submitTx).not.toHaveBeenCalled();
          expect(emissions.map(({ type }) => type)).toContain(
            'migrateWallet/stepFailed',
          );
        },
      }),
    );
  });

  it('refuses without signing when rewards turn ineligible between review and sweep (S8 re-check)', () => {
    const signTxFunction = vi.fn();
    const dependencies = createDependencies();
    // At sweep the re-fetched reward is withdrawable but the stake key has no
    // vote delegation at all, so a withdrawal would be rejected on-chain
    // (ConwayWdrlNotDelegatedToDRep). The sweep must refuse, not build and submit.
    dependencies.cardanoProvider.getRewardAccountInfo = vi.fn().mockReturnValue(
      of(
        Ok({
          isActive: true,
          isRegistered: true,
          rewardsSum: BigNumber(3_000_000n),
          withdrawableAmount: BigNumber(3_000_000n),
          controlledAmount: BigNumber(0n),
          // no drepId: never vote-delegated
        }),
      ),
    );

    testSideEffect(
      makeRunSweep({ signTxFunction, computeChunkPlans: singleChunkPlan }),
      ({ hot, cold, flush }) => ({
        actionObservables: sweepStartedMarble(hot),
        stateObservables: stateFor({ hot, cold }),
        dependencies,
        assertion: sideEffect$ => {
          const emissions: { type: string; payload?: unknown }[] = [];
          sideEffect$.subscribe(action => emissions.push(action));
          flush();

          expect(signTxFunction).not.toHaveBeenCalled();
          expect(dependencies.cardanoProvider.submitTx).not.toHaveBeenCalled();
          const unsupported = emissions.find(
            ({ type }) => type === 'migrateWallet/migrationUnsupported',
          );
          expect(unsupported?.payload).toEqual({
            errorKey: 'migrate-wallet.error.rewards-not-vote-delegated',
            amount: {
              value: '3000000',
              labelKey: 'migrate-wallet.unsupported.stuck-rewards',
            },
          });
        },
      }),
    );
  });

  it('signs and submits multiple chunks sequentially within a single auth window (FR-6)', async () => {
    // signWithAccounts is mocked at module level. The mock validates the auth
    // secret hasn't been zeroed, catching a regression where accessAuthSecret's
    // tap-zeroing fires between chunks.
    mockSignWithAccounts.mockImplementation(
      async ({ tx, authSecret }: { tx: unknown; authSecret: Uint8Array }) => {
        if (authSecret.every((b: number) => b === 0)) {
          throw new Error('Auth secret was zeroed before signing completed');
        }
        return tx;
      },
    );
    upsertActivitiesMock.mockClear();

    const submitTx = vi
      .fn()
      .mockReturnValue(
        of(Ok('chunk-txid' as unknown as Cardano.TransactionId)),
      );

    const authenticate = vi.fn().mockReturnValue(of(true));
    // Simulates accessAuthSecret's real zeroing: the clone is zeroed via tap
    // after each emission from the callback observable. Without toArray() in the
    // production code, the secret would be zeroed after chunk 0's emission,
    // causing chunk 1's signWithAccounts to fail.
    const accessAuthSecret = vi.fn(
      (callback: (s: Uint8Array) => Observable<unknown>) => {
        const secret = new Uint8Array(32).fill(1);
        return callback(secret).pipe(tap(() => secret.fill(0)));
      },
    );

    const deps = {
      logger: {
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn(),
        debug: vi.fn(),
        trace: vi.fn(),
      },
      cardanoProvider: {
        getAccountUtxos: vi.fn().mockReturnValue(of(Ok([]))),
        getRewardAccountInfo: vi.fn().mockReturnValue(
          of(
            Ok({
              isActive: false,
              isRegistered: false,
              rewardsSum: BigNumber(0n),
              withdrawableAmount: BigNumber(0n),
              controlledAmount: BigNumber(0n),
            }),
          ),
        ),
        submitTx,
      } as unknown as Mocked<CardanoProvider>,
      actions,
      authenticate,
      accessAuthSecret,
    };

    const walletWithKey = mock<AnyWallet>({
      walletId: sourceWalletId,
      type: 'InMemory',
      accounts: [createSourceAccount()],
      blockchainSpecific: {
        Cardano: { encryptedRootPrivateKey: 'deadbeef' },
      },
    } as Partial<AnyWallet>);

    const sourceGroupedAddress = {
      accountIndex: 0,
      address: sourceAddress,
      index: 0,
      networkId: chainId.networkId,
      rewardAccount: Cardano.RewardAccount(rewardAccount0),
      type: AddressType.External,
      stakeKeyDerivationPath: { role: 2, index: 0 },
    } as unknown as GroupedAddress;

    const sourceContext = {
      wallet: walletWithKey,
      chainId,
      protocolParameters,
      utxos: basePlan.utxos,
      addresses: [sourceGroupedAddress],
      signingAccounts: [
        {
          accountId: sourceAccountId,
          accountIndex: 0,
          extendedAccountPublicKey: 'xpub0' as Bip32PublicKeyHex,
        },
      ],
    };

    const twoChunkPlan: NonNullable<
      Parameters<typeof makeRunSweep>[0]
    >['computeChunkPlans'] = ({ utxos, rewardInfos }) =>
      of([
        { index: 0, utxos: [utxos[0]], rewardInfos: [], isLastChunk: false },
        { index: 1, utxos: [utxos[1]], rewardInfos, isLastChunk: true },
      ]);

    const trigger = new Subject<
      ReturnType<typeof migrateWalletActions.migrateWallet.sweepStarted>
    >();

    const sideEffect = makeRunSweep({
      resolveSourceContext: () => of(sourceContext),
      computeChunkPlans: twoChunkPlan,
      assertFullySigned: () => {},
      assertCoversPinnedSet: () => {},
    });

    const stateObs = {
      migrateWallet: {
        selectSourceWalletId$: of(sourceWalletId),
        selectSourceAccountId$: of(sourceAccountId),
        selectDestinationAccountId$: of(destinationAccountId),
        selectReviewedSweepPlan$: of(reviewedSweepPlan),
        selectSweepProgress$: of(undefined),
        selectDestinationWalletId$: of(undefined),
        selectMigrationMode$: of(undefined),
        selectAccountMapping$: of(undefined),
        selectPendingHwDestinationDevice$: of(undefined),
        selectResolvedDestinationIndexes$: of(undefined),
      },
      addresses: {
        selectByAccountId$: of((accountId: AccountId) =>
          accountId === destinationAccountId
            ? [
                cardanoAddress(
                  destinationAccountId,
                  destinationAddress,
                  chainId.networkId,
                ),
              ]
            : [
                cardanoAddress(
                  sourceAccountId,
                  sourceAddress,
                  chainId.networkId,
                ),
              ],
        ),
      },
      wallets: {
        selectAll$: of([]),
        selectWalletById$: of(() => walletWithKey),
      },
    };

    const actionObs = {
      migrateWallet: {
        sweepStarted$: trigger.asObservable(),
        sweepRetryRequested$: NEVER,
      },
    };

    const emissions: { type: string; payload?: unknown }[] = [];
    const output$ = sideEffect(
      actionObs as never,
      stateObs as never,
      deps as never,
    );
    const sub = output$.subscribe(action => emissions.push(action));

    trigger.next(migrateWalletActions.migrateWallet.sweepStarted());

    // buildChunkTx is Promise-based; allow async settle.
    await new Promise(r => setTimeout(r, 2000));

    // Both chunks signed and submitted.
    expect(submitTx).toHaveBeenCalledTimes(2);
    expect(mockSignWithAccounts).toHaveBeenCalledTimes(2);

    // sweepChunkSubmitted emitted for each chunk with correct indexes.
    const chunkActions = emissions.filter(
      ({ type }) => type === 'migrateWallet/sweepChunkSubmitted',
    );
    expect(chunkActions).toHaveLength(2);
    expect(chunkActions[0].payload).toEqual(
      expect.objectContaining({ index: 0, totalChunks: 2 }),
    );
    expect(chunkActions[1].payload).toEqual(
      expect.objectContaining({ index: 1, totalChunks: 2 }),
    );

    // Every submitted chunk gets its own pending activities, not just the last:
    // the destination has received those funds, and a plan that pauses part-way
    // would otherwise show nothing for transactions already on-chain. Two per
    // chunk — the destination's receipt and the source account's spend.
    expect(upsertActivitiesMock).toHaveBeenCalledTimes(4);

    // sweepSucceeded emitted after all chunks, reporting the fee the two
    // submitted transactions ACTUALLY paid — summed across chunks, not the
    // last chunk's alone. Decoded from what reached submitTx, so a regression
    // in the feePaid accumulator fails here.
    const submittedFees = submitTx.mock.calls.map(
      call =>
        Serialization.Transaction.fromCbor(
          Serialization.TxCBOR(
            (call[0] as { signedTransaction: string }).signedTransaction,
          ),
        ).toCore().body.fee,
    );
    expect(submittedFees).toHaveLength(2);
    const succeeded = emissions.find(
      ({ type }) => type === 'migrateWallet/sweepSucceeded',
    ) as unknown as { payload: { fee?: bigint } };
    expect(succeeded.payload.fee).toBe(
      submittedFees.reduce((sum, fee) => sum + fee, 0n),
    );

    const types = emissions.map(({ type }) => type);
    expect(types).toContain('migrateWallet/sweepSucceeded');

    // Single auth prompt for all chunks.
    expect(authenticate).toHaveBeenCalledTimes(1);
    expect(accessAuthSecret).toHaveBeenCalledTimes(1);

    sub.unsubscribe();
  });

  it('classifies a dismissed prompt on the chunked path as cancelled, not paused', async () => {
    // authenticate resolving false throws AuthenticationCancelledError before
    // any chunk is built or signed. The chunked catchError previously mapped
    // every error to sweepPaused — offering "Try again" for a plan that never
    // started.
    const authenticate = vi.fn().mockReturnValue(of(false));
    const accessAuthSecret = vi.fn();
    const submitTx = vi.fn();

    const walletWithKey = mock<AnyWallet>({
      walletId: sourceWalletId,
      type: 'InMemory',
      accounts: [createSourceAccount()],
      blockchainSpecific: {
        Cardano: { encryptedRootPrivateKey: 'deadbeef' },
      },
    } as Partial<AnyWallet>);

    const sourceContext = {
      wallet: walletWithKey,
      chainId,
      protocolParameters,
      utxos: basePlan.utxos,
      addresses: [
        {
          accountIndex: 0,
          address: sourceAddress,
          index: 0,
          networkId: chainId.networkId,
          rewardAccount: Cardano.RewardAccount(rewardAccount0),
          type: AddressType.External,
          stakeKeyDerivationPath: { role: 2, index: 0 },
        } as unknown as GroupedAddress,
      ],
      signingAccounts: [
        {
          accountId: sourceAccountId,
          accountIndex: 0,
          extendedAccountPublicKey: 'xpub0' as Bip32PublicKeyHex,
        },
      ],
    };

    const twoChunkPlan: NonNullable<
      Parameters<typeof makeRunSweep>[0]
    >['computeChunkPlans'] = ({ utxos, rewardInfos }) =>
      of([
        { index: 0, utxos: [utxos[0]], rewardInfos: [], isLastChunk: false },
        { index: 1, utxos: [utxos[1]], rewardInfos, isLastChunk: true },
      ]);

    const trigger = new Subject<
      ReturnType<typeof migrateWalletActions.migrateWallet.sweepStarted>
    >();

    const sideEffect = makeRunSweep({
      resolveSourceContext: () => of(sourceContext),
      computeChunkPlans: twoChunkPlan,
      assertFullySigned: () => {},
      assertCoversPinnedSet: () => {},
    });

    const stateObs = {
      migrateWallet: {
        selectSourceWalletId$: of(sourceWalletId),
        selectSourceAccountId$: of(sourceAccountId),
        selectDestinationAccountId$: of(destinationAccountId),
        selectReviewedSweepPlan$: of(reviewedSweepPlan),
        selectSweepProgress$: of(undefined),
        selectDestinationWalletId$: of(undefined),
        selectMigrationMode$: of(undefined),
        selectAccountMapping$: of(undefined),
        selectPendingHwDestinationDevice$: of(undefined),
        selectResolvedDestinationIndexes$: of(undefined),
      },
      addresses: {
        selectByAccountId$: of(() => [
          cardanoAddress(
            destinationAccountId,
            destinationAddress,
            chainId.networkId,
          ),
        ]),
      },
      wallets: {
        selectAll$: of([]),
        selectWalletById$: of(() => walletWithKey),
      },
    };

    const emissions: { type: string }[] = [];
    const sub = sideEffect(
      {
        migrateWallet: {
          sweepStarted$: trigger.asObservable(),
          sweepRetryRequested$: NEVER,
        },
      } as never,
      stateObs as never,
      {
        logger: {
          error: vi.fn(),
          warn: vi.fn(),
          info: vi.fn(),
          debug: vi.fn(),
          trace: vi.fn(),
        },
        cardanoProvider: {
          getAccountUtxos: vi.fn().mockReturnValue(of(Ok([]))),
          getRewardAccountInfo: vi.fn().mockReturnValue(
            of(
              Ok({
                isActive: false,
                isRegistered: false,
                rewardsSum: BigNumber(0n),
                withdrawableAmount: BigNumber(0n),
                controlledAmount: BigNumber(0n),
              }),
            ),
          ),
          submitTx,
        } as unknown as Mocked<CardanoProvider>,
        actions,
        authenticate,
        accessAuthSecret,
      } as never,
    ).subscribe(action => emissions.push(action));

    trigger.next(migrateWalletActions.migrateWallet.sweepStarted());
    const deadline = Date.now() + 2000;
    while (emissions.length === 0 && Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 10));
    }
    sub.unsubscribe();

    const types = emissions.map(({ type }) => type);
    expect(types).toContain('migrateWallet/sweepAuthCancelled');
    expect(types).not.toContain('migrateWallet/sweepPaused');
    expect(types).not.toContain('migrateWallet/stepFailed');
    expect(accessAuthSecret).not.toHaveBeenCalled();
    expect(submitTx).not.toHaveBeenCalled();
  });

  it('on partial chunk failure, retry re-plans from only the unspent UTxOs (FR-6 resume)', async () => {
    // 3 UTxOs, each in its own chunk. Chunks 0 and 1 submit successfully
    // but chunk 2 fails, causing sweepPaused. On retry the resume resolver
    // returns only utxo2 (the provider no longer lists the spent inputs),
    // so the retry must NOT re-send utxo0 or utxo1.
    mockSignWithAccounts.mockImplementation(
      async ({ tx }: { tx: unknown }) => tx,
    );

    const utxo0 = createUtxo(3_000_000n, undefined, 0);
    const utxo1 = createUtxo(4_000_000n, undefined, 1);
    const utxo2 = createUtxo(5_000_000n, undefined, 2);

    // Submissions 1–2 succeed; submission 3 fails; submission 4 (retry) succeeds.
    let submitCallCount = 0;
    const submitTx = vi.fn(() => {
      submitCallCount++;
      if (submitCallCount === 3) {
        return of(Err(new Error('network error')));
      }
      return of(
        Ok(`tx-${submitCallCount}` as unknown as Cardano.TransactionId),
      );
    });

    const authenticate = vi.fn().mockReturnValue(of(true));
    const accessAuthSecret = vi.fn(
      (callback: (s: Uint8Array) => Observable<unknown>) => {
        const secret = new Uint8Array(32).fill(1);
        return callback(secret).pipe(tap(() => secret.fill(0)));
      },
    );

    const walletWithKey = mock<AnyWallet>({
      walletId: sourceWalletId,
      type: 'InMemory',
      accounts: [createSourceAccount()],
      blockchainSpecific: {
        Cardano: { encryptedRootPrivateKey: 'deadbeef' },
      },
    } as Partial<AnyWallet>);

    const grpAddr = {
      accountIndex: 0,
      address: sourceAddress,
      index: 0,
      networkId: chainId.networkId,
      rewardAccount: Cardano.RewardAccount(rewardAccount0),
      type: AddressType.External,
      stakeKeyDerivationPath: { role: 2, index: 0 },
    } as unknown as GroupedAddress;

    const initialContext = {
      wallet: walletWithKey,
      chainId,
      protocolParameters,
      utxos: [utxo0, utxo1, utxo2],
      addresses: [grpAddr],
      signingAccounts: [
        {
          accountId: sourceAccountId,
          accountIndex: 0,
          extendedAccountPublicKey: 'xpub0' as Bip32PublicKeyHex,
        },
      ],
    };

    // Resume context: only utxo2 survives (chunks 0 and 1 already spent).
    const resumeContext = { ...initialContext, utxos: [utxo2] };

    // Track which UTxOs computeChunkPlans receives on each invocation.
    const chunkPlanCalls: Cardano.Utxo[][] = [];
    const computeChunkPlans: NonNullable<
      Parameters<typeof makeRunSweep>[0]
    >['computeChunkPlans'] = ({ utxos, rewardInfos }) => {
      chunkPlanCalls.push([...utxos]);
      return of(
        utxos.map((utxo, index, all) => ({
          index,
          utxos: [utxo],
          rewardInfos: index === all.length - 1 ? rewardInfos : [],
          isLastChunk: index === all.length - 1,
          // Attributed chunks, as a preserve sweep plans them. The offset
          // keeps source and destination distinguishable below.
          sourceAccountIndex: index,
          destinationAccountIndex: index + 10,
        })),
      );
    };

    // BehaviorSubject so the retry trigger sees non-null sweepProgress.
    const sweepProgress$ = new BehaviorSubject<
      | {
          totalChunks: number;
          submittedChunks: { index: number; txId: string }[];
        }
      | undefined
    >(undefined);

    const sideEffect = makeRunSweep({
      resolveSourceContext: () => of(initialContext),
      resolveResumeSourceContext: () => of(resumeContext),
      // Single-chunk retry path calls signTxFunction; pass through.
      signTxFunction: (_source, tx) => of(tx),
      computeChunkPlans,
      assertFullySigned: () => {},
      assertCoversPinnedSet: () => {},
    });

    const deps = {
      logger: {
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn(),
        debug: vi.fn(),
        trace: vi.fn(),
      },
      cardanoProvider: {
        getAccountUtxos: vi.fn().mockReturnValue(of(Ok([]))),
        getRewardAccountInfo: vi.fn().mockReturnValue(
          of(
            Ok({
              isActive: false,
              isRegistered: false,
              rewardsSum: BigNumber(0n),
              withdrawableAmount: BigNumber(0n),
              controlledAmount: BigNumber(0n),
            }),
          ),
        ),
        submitTx,
      } as unknown as Mocked<CardanoProvider>,
      actions,
      authenticate,
      accessAuthSecret,
    };

    const startTrigger = new Subject<
      ReturnType<typeof migrateWalletActions.migrateWallet.sweepStarted>
    >();
    const retryTrigger = new Subject<
      ReturnType<typeof migrateWalletActions.migrateWallet.sweepRetryRequested>
    >();

    const stateObs = {
      migrateWallet: {
        selectSourceWalletId$: of(sourceWalletId),
        selectSourceAccountId$: of(sourceAccountId),
        selectDestinationAccountId$: of(destinationAccountId),
        selectReviewedSweepPlan$: of(reviewedSweepPlan),
        selectSweepProgress$: sweepProgress$.asObservable(),
        selectDestinationWalletId$: of(undefined),
        selectMigrationMode$: of(undefined),
        selectAccountMapping$: of(undefined),
        selectPendingHwDestinationDevice$: of(undefined),
        selectResolvedDestinationIndexes$: of(undefined),
      },
      addresses: {
        selectByAccountId$: of((accountId: AccountId) =>
          accountId === destinationAccountId
            ? [
                cardanoAddress(
                  destinationAccountId,
                  destinationAddress,
                  chainId.networkId,
                ),
              ]
            : [
                cardanoAddress(
                  sourceAccountId,
                  sourceAddress,
                  chainId.networkId,
                ),
              ],
        ),
      },
      wallets: {
        selectAll$: of([]),
        selectWalletById$: of(() => walletWithKey),
      },
    };

    const actionObs = {
      migrateWallet: {
        sweepStarted$: startTrigger.asObservable(),
        sweepRetryRequested$: retryTrigger.asObservable(),
      },
    };

    const emissions: { type: string; payload?: unknown }[] = [];
    const output$ = sideEffect(
      actionObs as never,
      stateObs as never,
      deps as never,
    );
    const sub = output$.subscribe(action => emissions.push(action));

    // ── Phase 1: initial sweep ──
    startTrigger.next(migrateWalletActions.migrateWallet.sweepStarted());
    await new Promise(r => setTimeout(r, 2000));

    // Chunks 0 and 1 submitted OK; chunk 2 threw → sweepPaused.
    expect(submitTx).toHaveBeenCalledTimes(3);
    const phase1Types = emissions.map(({ type }) => type);
    expect(phase1Types).toContain('migrateWallet/sweepPaused');

    // Chunk progress for the two successful submissions is emitted before
    // sweepPaused so the store records partial progress even though
    // toArray() never completed.
    const chunkActions = emissions.filter(
      ({ type }) => type === 'migrateWallet/sweepChunkSubmitted',
    );
    expect(chunkActions).toHaveLength(2);
    // Attribution survives the replay. These emissions come from the failure
    // path, not the success path — toArray() never completed — and replaying
    // only {index, txId} left the report unable to attribute anything
    // submitted before the pause, which is the case it was added for.
    expect(chunkActions[0].payload).toEqual(
      expect.objectContaining({
        index: 0,
        totalChunks: 3,
        sourceAccountIndex: 0,
        destinationAccountIndex: 10,
      }),
    );
    expect(chunkActions[1].payload).toEqual(
      expect.objectContaining({
        index: 1,
        totalChunks: 3,
        sourceAccountIndex: 1,
        destinationAccountIndex: 11,
      }),
    );

    // sweepChunkSubmitted must precede sweepPaused so the reducer processes
    // them while step is still 'sweeping'.
    const chunkIndex = phase1Types.indexOf('migrateWallet/sweepChunkSubmitted');
    const pauseIndex = phase1Types.indexOf('migrateWallet/sweepPaused');
    expect(chunkIndex).toBeLessThan(pauseIndex);

    // computeChunkPlans saw all 3 UTxOs on the first call.
    expect(chunkPlanCalls[0]).toHaveLength(3);

    // ── Phase 2: retry ──
    // Simulate the store reflecting the partial progress so isResume is true.
    // In a real app the sweepChunkSubmitted actions above would have set this
    // via the reducer; here the test drives it manually because there is no
    // store feedback loop.
    sweepProgress$.next({
      totalChunks: 3,
      submittedChunks: [
        { index: 0, txId: 'tx-1' },
        { index: 1, txId: 'tx-2' },
      ],
    });

    retryTrigger.next(migrateWalletActions.migrateWallet.sweepRetryRequested());
    await new Promise(r => setTimeout(r, 2000));

    // Resume path invoked computeChunkPlans with only the remaining UTxO.
    expect(chunkPlanCalls).toHaveLength(2);
    expect(chunkPlanCalls[1]).toHaveLength(1);
    expect(chunkPlanCalls[1][0]).toBe(utxo2);

    // One more submission on retry (4 total across both phases).
    expect(submitTx).toHaveBeenCalledTimes(4);

    // Sweep succeeded after retry.
    expect(emissions.map(({ type }) => type)).toContain(
      'migrateWallet/sweepSucceeded',
    );

    sub.unsubscribe();
    sweepProgress$.complete();
  });

  // Harness for the empty-intersection resume: the pinned plan intersected
  // with live UTxOs to nothing, and what happens next must depend on whether
  // OUR submissions account for that.
  const runEmptyResumeSweep = async (sweepProgress: {
    totalChunks: number;
    submittedChunks: { index: number; txId: string }[];
  }): Promise<{ type: string; payload?: unknown }[]> => {
    const emissions: { type: string; payload?: unknown }[] = [];
    const trigger = new Subject<
      ReturnType<typeof migrateWalletActions.migrateWallet.sweepRetryRequested>
    >();

    const emptyResumeContext = {
      wallet: mock<AnyWallet>({ walletId: sourceWalletId }),
      chainId,
      protocolParameters,
      // The pinned set intersected to nothing.
      utxos: [],
      addresses: [
        { rewardAccount: 'stake_test1' } as unknown as GroupedAddress,
      ],
      signingAccounts: [
        {
          accountId: sourceAccountId,
          accountIndex: 0,
          extendedAccountPublicKey: 'xpub0' as Bip32PublicKeyHex,
        },
      ],
    };

    const sideEffect = makeRunSweep({
      resolveResumeSourceContext: (() => of(emptyResumeContext)) as never,
    })(
      {
        migrateWallet: {
          sweepStarted$: NEVER as never,
          sweepRetryRequested$: trigger.asObservable() as never,
        },
      } as never,
      {
        migrateWallet: {
          selectSourceWalletId$: of(sourceWalletId),
          selectSourceAccountId$: of(sourceAccountId),
          selectDestinationAccountId$: of(destinationAccountId),
          selectReviewedSweepPlan$: of(reviewedSweepPlan),
          selectSweepProgress$: of(sweepProgress),
          selectDestinationWalletId$: of(undefined),
          selectMigrationMode$: of(undefined),
          selectAccountMapping$: of(undefined),
          selectPendingHwDestinationDevice$: of(undefined),
          selectResolvedDestinationIndexes$: of(undefined),
        },
        wallets: { selectAll$: of([]) },
        addresses: {
          selectByAccountId$: of(() => [
            cardanoAddress(
              destinationAccountId,
              destinationAddress,
              chainId.networkId,
            ),
          ]),
        },
      } as never,
      {
        logger: {
          error: vi.fn(),
          warn: vi.fn(),
          info: vi.fn(),
          debug: vi.fn(),
          trace: vi.fn(),
        },
        cardanoProvider: {
          getRewardAccountInfo: vi.fn().mockReturnValue(
            of(
              Ok({
                isActive: false,
                isRegistered: false,
                rewardsSum: BigNumber(0n),
                withdrawableAmount: BigNumber(0n),
                controlledAmount: BigNumber(0n),
              }),
            ),
          ),
        } as unknown as Mocked<CardanoProvider>,
        actions,
      } as never,
    );

    const sub = sideEffect.subscribe(action => emissions.push(action));
    trigger.next(migrateWalletActions.migrateWallet.sweepRetryRequested());
    // The injected pipeline is synchronous of()s with promise hops between
    // stages; poll the emissions instead of sleeping a fixed interval.
    const deadline = Date.now() + 2000;
    while (emissions.length === 0 && Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 10));
    }
    sub.unsubscribe();
    return emissions;
  };

  it('refuses to report success when the pinned inputs vanished and we spent none of them', async () => {
    // Something else spent the source's UTxOs. On a flow the user entered
    // believing their phrase is compromised, that is plausibly an attacker
    // holding the same keys — so this must not land on the done screen.
    const emissions = await runEmptyResumeSweep({
      totalChunks: 2,
      submittedChunks: [],
    });

    const types = emissions.map(({ type }) => type);
    expect(types).not.toContain('migrateWallet/sweepSucceeded');
    expect(types).toContain('migrateWallet/stepFailed');
  });

  it('refuses to report success when only some chunks were submitted and the rest vanished', async () => {
    // One of three chunks is ours; the other two thirds of the pinned inputs
    // are gone without us spending them. "We submitted some" must not report
    // the unswept remainder as arrived.
    const emissions = await runEmptyResumeSweep({
      totalChunks: 3,
      submittedChunks: [{ index: 0, txId: 'tx-chunk-0' }],
    });

    const types = emissions.map(({ type }) => type);
    expect(types).not.toContain('migrateWallet/sweepSucceeded');
    expect(types).toContain('migrateWallet/stepFailed');
  });

  it('reports success with the last chunk as receipt when every planned chunk is on-chain', async () => {
    const emissions = await runEmptyResumeSweep({
      totalChunks: 2,
      submittedChunks: [
        { index: 0, txId: 'tx-chunk-0' },
        { index: 1, txId: 'tx-chunk-1' },
      ],
    });

    const succeeded = emissions.find(
      ({ type }) => type === 'migrateWallet/sweepSucceeded',
    ) as { payload: { txId: string } } | undefined;
    // The LAST chunk is the receipt — the first chunk's txId here would mean
    // the done screen links a transaction that moved a fraction of the funds.
    expect(succeeded?.payload.txId).toBe('tx-chunk-1');
  });

  it('on first-chunk failure, retry re-sends the full UTxO set (FR-6 resume, nothing spent)', async () => {
    // The very first chunk submission fails, so NO UTxOs have been spent.
    // On retry the resume resolver returns all 3 UTxOs (the provider still
    // lists every input), and the sweep must re-plan and re-submit all of
    // them — the complement of the partial-failure test above.
    mockSignWithAccounts.mockImplementation(
      async ({ tx }: { tx: unknown }) => tx,
    );

    const utxo0 = createUtxo(3_000_000n, undefined, 0);
    const utxo1 = createUtxo(4_000_000n, undefined, 1);
    const utxo2 = createUtxo(5_000_000n, undefined, 2);

    // Submission 1 fails; submissions 2–4 (retry) succeed.
    let submitCallCount = 0;
    const submitTx = vi.fn(() => {
      submitCallCount++;
      if (submitCallCount === 1) {
        return of(Err(new Error('network error')));
      }
      return of(
        Ok(`tx-${submitCallCount}` as unknown as Cardano.TransactionId),
      );
    });

    const authenticate = vi.fn().mockReturnValue(of(true));
    const accessAuthSecret = vi.fn(
      (callback: (s: Uint8Array) => Observable<unknown>) => {
        const secret = new Uint8Array(32).fill(1);
        return callback(secret).pipe(tap(() => secret.fill(0)));
      },
    );

    const walletWithKey = mock<AnyWallet>({
      walletId: sourceWalletId,
      type: 'InMemory',
      accounts: [createSourceAccount()],
      blockchainSpecific: {
        Cardano: { encryptedRootPrivateKey: 'deadbeef' },
      },
    } as Partial<AnyWallet>);

    const grpAddr = {
      accountIndex: 0,
      address: sourceAddress,
      index: 0,
      networkId: chainId.networkId,
      rewardAccount: Cardano.RewardAccount(rewardAccount0),
      type: AddressType.External,
      stakeKeyDerivationPath: { role: 2, index: 0 },
    } as unknown as GroupedAddress;

    const fullContext = {
      wallet: walletWithKey,
      chainId,
      protocolParameters,
      utxos: [utxo0, utxo1, utxo2],
      addresses: [grpAddr],
      signingAccounts: [
        {
          accountId: sourceAccountId,
          accountIndex: 0,
          extendedAccountPublicKey: 'xpub0' as Bip32PublicKeyHex,
        },
      ],
    };

    const chunkPlanCalls: Cardano.Utxo[][] = [];
    const computeChunkPlans: NonNullable<
      Parameters<typeof makeRunSweep>[0]
    >['computeChunkPlans'] = ({ utxos, rewardInfos }) => {
      chunkPlanCalls.push([...utxos]);
      return of(
        utxos.map((utxo, index, all) => ({
          index,
          utxos: [utxo],
          rewardInfos: index === all.length - 1 ? rewardInfos : [],
          isLastChunk: index === all.length - 1,
        })),
      );
    };

    const sweepProgress$ = new BehaviorSubject<
      | {
          totalChunks: number;
          submittedChunks: { index: number; txId: string }[];
        }
      | undefined
    >(undefined);

    const sideEffect = makeRunSweep({
      resolveSourceContext: () => of(fullContext),
      // Nothing was spent, so the resume resolver returns all UTxOs.
      resolveResumeSourceContext: () => of(fullContext),
      computeChunkPlans,
      assertFullySigned: () => {},
      assertCoversPinnedSet: () => {},
    });

    const deps = {
      logger: {
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn(),
        debug: vi.fn(),
        trace: vi.fn(),
      },
      cardanoProvider: {
        getAccountUtxos: vi.fn().mockReturnValue(of(Ok([]))),
        getRewardAccountInfo: vi.fn().mockReturnValue(
          of(
            Ok({
              isActive: false,
              isRegistered: false,
              rewardsSum: BigNumber(0n),
              withdrawableAmount: BigNumber(0n),
              controlledAmount: BigNumber(0n),
            }),
          ),
        ),
        submitTx,
      } as unknown as Mocked<CardanoProvider>,
      actions,
      authenticate,
      accessAuthSecret,
    };

    const startTrigger = new Subject<
      ReturnType<typeof migrateWalletActions.migrateWallet.sweepStarted>
    >();
    const retryTrigger = new Subject<
      ReturnType<typeof migrateWalletActions.migrateWallet.sweepRetryRequested>
    >();

    const stateObs = {
      migrateWallet: {
        selectSourceWalletId$: of(sourceWalletId),
        selectSourceAccountId$: of(sourceAccountId),
        selectDestinationAccountId$: of(destinationAccountId),
        selectReviewedSweepPlan$: of(reviewedSweepPlan),
        selectSweepProgress$: sweepProgress$.asObservable(),
        selectDestinationWalletId$: of(undefined),
        selectMigrationMode$: of(undefined),
        selectAccountMapping$: of(undefined),
        selectPendingHwDestinationDevice$: of(undefined),
        selectResolvedDestinationIndexes$: of(undefined),
      },
      addresses: {
        selectByAccountId$: of((accountId: AccountId) =>
          accountId === destinationAccountId
            ? [
                cardanoAddress(
                  destinationAccountId,
                  destinationAddress,
                  chainId.networkId,
                ),
              ]
            : [
                cardanoAddress(
                  sourceAccountId,
                  sourceAddress,
                  chainId.networkId,
                ),
              ],
        ),
      },
      wallets: {
        selectAll$: of([]),
        selectWalletById$: of(() => walletWithKey),
      },
    };

    const actionObs = {
      migrateWallet: {
        sweepStarted$: startTrigger.asObservable(),
        sweepRetryRequested$: retryTrigger.asObservable(),
      },
    };

    const emissions: { type: string; payload?: unknown }[] = [];
    const output$ = sideEffect(
      actionObs as never,
      stateObs as never,
      deps as never,
    );
    const sub = output$.subscribe(action => emissions.push(action));

    // ── Phase 1: initial sweep — first chunk fails immediately ──
    startTrigger.next(migrateWalletActions.migrateWallet.sweepStarted());
    await new Promise(r => setTimeout(r, 2000));

    // Only one submit attempted (the failing first chunk); concatMap stops.
    expect(submitTx).toHaveBeenCalledTimes(1);
    expect(emissions.map(({ type }) => type)).toContain(
      'migrateWallet/sweepPaused',
    );

    // No sweepChunkSubmitted emitted — nothing was submitted successfully.
    expect(
      emissions.filter(
        ({ type }) => type === 'migrateWallet/sweepChunkSubmitted',
      ),
    ).toHaveLength(0);

    // computeChunkPlans saw all 3 UTxOs.
    expect(chunkPlanCalls[0]).toHaveLength(3);

    // ── Phase 2: retry — nothing was spent, full set re-sent ──
    // sweepProgress stays undefined (no chunks confirmed), so isResume is
    // false and the retry uses resolveSourceContext, which returns the
    // unchanged reviewed plan. No manual sweepProgress update needed.

    retryTrigger.next(migrateWalletActions.migrateWallet.sweepRetryRequested());
    await new Promise(r => setTimeout(r, 2000));

    // Resume path received all 3 UTxOs (none were spent on-chain).
    expect(chunkPlanCalls).toHaveLength(2);
    expect(chunkPlanCalls[1]).toHaveLength(3);
    expect(chunkPlanCalls[1][0]).toBe(utxo0);
    expect(chunkPlanCalls[1][1]).toBe(utxo1);
    expect(chunkPlanCalls[1][2]).toBe(utxo2);

    // 3 more submissions on retry (4 total across both phases).
    expect(submitTx).toHaveBeenCalledTimes(4);

    // Sweep succeeded after retry.
    expect(emissions.map(({ type }) => type)).toContain(
      'migrateWallet/sweepSucceeded',
    );

    sub.unsubscribe();
    sweepProgress$.complete();
  });
});

describe('makeTrackWalletCreation', () => {
  const trackDependencies = () => ({
    logger: {
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
      trace: vi.fn(),
    },
    actions,
  });

  it('aborts the source watcher on cancel so a late import cannot resurrect the wizard', () => {
    const dependencies = trackDependencies();

    testSideEffect(makeTrackWalletCreation(), ({ hot, flush }) => ({
      actionObservables: {
        onboardingV2: {
          createWalletSuccess$: hot('---'),
          createWalletFailure$: hot('---'),
        },
        migrateWallet: {
          destinationCreationStarted$: hot('---') as never,
          // Delayed one frame so selectAll$ has primed withLatestFrom (else
          // the source action is dropped before the watcher even starts).
          sourceImportStarted$: hot('-a', {
            a: migrateWalletActions.migrateWallet.sourceImportStarted(),
          }),
          hwDeviceConnected$: hot('---') as never,
          // Cancel (frame 3) lands AFTER import starts (1) but BEFORE the
          // imported wallet appears (frame 5).
          wizardCancelled$: hot('---c', {
            c: migrateWalletActions.migrateWallet.wizardCancelled(),
          }),
        },
        accountManagement: {
          hardwareWalletCreationFailed$: hot('---') as never,
        },
      },
      stateObservables: {
        migrateWallet: {
          selectPendingHwSource$: hot('a', { a: undefined }),
          selectStep$: hot('a', { a: 'importingSource' }),
        },
        wallets: {
          // Empty when import starts; the freshly imported source appears at
          // frame 5 — after the cancel. Without the takeUntil this drives
          // `sourceImported` at frame 5 and reopens the abandoned wizard.
          selectAll$: hot('a----b', { a: [], b: [createSourceWallet()] }),
          selectWalletById$: hot('a', {
            a: (walletId: string) =>
              walletId === sourceWalletId ? createSourceWallet() : undefined,
          }),
        },
        cardanoContext: {
          selectBlockchainNetworkId$: hot('a', {
            a: BlockchainNetworkId('cardano-mainnet'),
          }) as never,
        },
      },
      dependencies,
      assertion: sideEffect$ => {
        const emissions: { type: string }[] = [];
        sideEffect$.subscribe(action => emissions.push(action));
        flush();

        expect(
          emissions.some(({ type }) => type === 'migrateWallet/sourceImported'),
        ).toBe(false);
        expect(
          emissions.some(({ type }) => type === 'migrateWallet/stepFailed'),
        ).toBe(false);
      },
    }));
  });

  it('detects a hardware destination created via accountManagement (settings path) by wallet-repo polling', () => {
    const dependencies = trackDependencies();
    const hwWalletId = WalletId('hw-destination');
    const hwWallet = mock<AnyWallet>({
      walletId: hwWalletId,
      type: 'InMemory',
      accounts: [
        buildCardanoAccount({
          accountId: AccountId('hw-account'),
          walletId: hwWalletId,
          accountIndex: 0,
          chainId,
          extendedAccountPublicKey:
            'xpub5678' as CardanoBip32AccountProps['extendedAccountPublicKey'],
          blockchainNetworkId: BlockchainNetworkId('cardano-mainnet'),
          networkType: 'mainnet',
        }),
      ],
    } as Partial<AnyWallet>);

    testSideEffect(makeTrackWalletCreation(), ({ hot, flush }) => ({
      actionObservables: {
        onboardingV2: {
          createWalletSuccess$: hot('------'),
          createWalletFailure$: hot('------'),
        },
        migrateWallet: {
          destinationCreationStarted$: hot('------') as never,
          sourceImportStarted$: hot('------') as never,
          hwDeviceConnected$: hot('-a', {
            a: migrateWalletActions.migrateWallet.hwDeviceConnected({
              needsPassword: false,
            }),
          }),
          wizardCancelled$: hot('------') as never,
        },
        accountManagement: {
          hardwareWalletCreationFailed$: hot('------') as never,
        },
      },
      stateObservables: {
        migrateWallet: {
          selectPendingHwSource$: hot('a', { a: undefined }),
          selectStep$: hot('a', { a: 'creatingDestination' }),
        },
        wallets: {
          // The HW wallet appears at frame 3; cardanoAccount$ subscribes to
          // combineLatest inside the mergeMap at that frame, so the
          // dependencies below must re-emit after frame 3.
          selectAll$: hot('a--b', { a: [], b: [hwWallet] }),
          selectWalletById$: hot('a--a', {
            a: (walletId: string) =>
              walletId === hwWalletId ? hwWallet : undefined,
          }),
        },
        cardanoContext: {
          selectBlockchainNetworkId$: hot('a--a', {
            a: BlockchainNetworkId('cardano-mainnet'),
          }) as never,
        },
      },
      dependencies,
      assertion: sideEffect$ => {
        const emissions: { type: string; payload?: unknown }[] = [];
        sideEffect$.subscribe(action => emissions.push(action));
        flush();

        const created = emissions.find(
          ({ type }) => type === 'migrateWallet/destinationCreated',
        );
        expect(created).toBeDefined();
        expect(
          (created?.payload as { destinationWalletId: string })
            .destinationWalletId,
        ).toBe(hwWalletId);
      },
    }));
  });

  it('detects a hardware destination when accountManagement updates an existing wallet with new accounts', () => {
    const dependencies = trackDependencies();
    const existingHwWalletId = WalletId('existing-hw');
    const existingAccountId = AccountId('existing-hw-account');
    const newAccountId = AccountId('new-hw-account');

    const existingHwWallet = mock<AnyWallet>({
      walletId: existingHwWalletId,
      type: 'InMemory',
      accounts: [
        buildCardanoAccount({
          accountId: existingAccountId,
          walletId: existingHwWalletId,
          accountIndex: 0,
          chainId,
          extendedAccountPublicKey:
            'xpub_existing' as CardanoBip32AccountProps['extendedAccountPublicKey'],
          blockchainNetworkId: BlockchainNetworkId('cardano-mainnet'),
          networkType: 'mainnet',
        }),
      ],
    } as Partial<AnyWallet>);

    const updatedHwWallet = mock<AnyWallet>({
      walletId: existingHwWalletId,
      accounts: [
        ...existingHwWallet.accounts,
        buildCardanoAccount({
          accountId: newAccountId,
          walletId: existingHwWalletId,
          accountIndex: 1,
          chainId,
          extendedAccountPublicKey:
            'xpub_new' as CardanoBip32AccountProps['extendedAccountPublicKey'],
          blockchainNetworkId: BlockchainNetworkId('cardano-mainnet'),
          networkType: 'mainnet',
        }),
      ],
    } as Partial<AnyWallet>);

    testSideEffect(makeTrackWalletCreation(), ({ hot, flush }) => ({
      actionObservables: {
        onboardingV2: {
          createWalletSuccess$: hot('------'),
          createWalletFailure$: hot('------'),
        },
        migrateWallet: {
          destinationCreationStarted$: hot('------') as never,
          sourceImportStarted$: hot('------') as never,
          hwDeviceConnected$: hot('-a', {
            a: migrateWalletActions.migrateWallet.hwDeviceConnected({
              needsPassword: false,
            }),
          }),
          wizardCancelled$: hot('------') as never,
        },
        accountManagement: {
          hardwareWalletCreationFailed$: hot('------') as never,
        },
      },
      stateObservables: {
        migrateWallet: {
          selectPendingHwSource$: hot('a', { a: undefined }),
          selectStep$: hot('a', { a: 'creatingDestination' }),
        },
        wallets: {
          // Same walletId before and after — only account list changes.
          selectAll$: hot('a--b', {
            a: [existingHwWallet],
            b: [updatedHwWallet],
          }),
          selectWalletById$: hot('a--b', {
            a: (walletId: string) =>
              walletId === existingHwWalletId ? updatedHwWallet : undefined,
            b: (walletId: string) =>
              walletId === existingHwWalletId ? updatedHwWallet : undefined,
          }),
        },
        cardanoContext: {
          selectBlockchainNetworkId$: hot('a--a', {
            a: BlockchainNetworkId('cardano-mainnet'),
          }) as never,
        },
      },
      dependencies,
      assertion: sideEffect$ => {
        const emissions: { type: string; payload?: unknown }[] = [];
        sideEffect$.subscribe(action => emissions.push(action));
        flush();

        const created = emissions.find(
          ({ type }) => type === 'migrateWallet/destinationCreated',
        );
        expect(created).toBeDefined();
        expect(
          (created?.payload as { destinationWalletId: string })
            .destinationWalletId,
        ).toBe(existingHwWalletId);
      },
    }));
  });

  it('detects an onboarding destination via createWalletSuccess (fresh and HW-onboarding paths)', () => {
    const dependencies = trackDependencies();
    const destinationWalletId = WalletId('onboarding-dest');
    const destinationAccumulatorId = AccountId('onboarding-dest-account');
    const destinationWallet = mock<AnyWallet>({
      walletId: destinationWalletId,
      type: 'InMemory',
      accounts: [
        buildCardanoAccount({
          accountId: destinationAccumulatorId,
          walletId: destinationWalletId,
          accountIndex: 0,
          chainId,
          extendedAccountPublicKey:
            'xpub_dest' as CardanoBip32AccountProps['extendedAccountPublicKey'],
          blockchainNetworkId: BlockchainNetworkId('cardano-mainnet'),
          networkType: 'mainnet',
        }),
      ],
    } as Partial<AnyWallet>);

    testSideEffect(makeTrackWalletCreation(), ({ hot, flush }) => ({
      actionObservables: {
        onboardingV2: {
          createWalletSuccess$: hot('-a', {
            a: {
              type: 'onboardingV2/createWalletSuccess',
              payload: {
                walletId: destinationWalletId,
                isRecovery: false,
                walletType: WalletType.InMemory,
                blockchains: ['Cardano'],
              },
            },
          }),
          createWalletFailure$: hot('------'),
        },
        migrateWallet: {
          destinationCreationStarted$: hot('------') as never,
          sourceImportStarted$: hot('------') as never,
          hwDeviceConnected$: hot('------') as never,
          wizardCancelled$: hot('------') as never,
        },
        accountManagement: {
          hardwareWalletCreationFailed$: hot('------') as never,
        },
      },
      stateObservables: {
        migrateWallet: {
          selectPendingHwSource$: hot('a', { a: undefined }),
          selectStep$: hot('a', { a: 'creatingDestination' }),
        },
        wallets: {
          selectAll$: hot('a', { a: [destinationWallet] }),
          // Emit again at frame 2 so the combineLatest inside
          // cardanoAccount$ (subscribed at frame 1 by the mergeMap)
          // receives a value — a single frame-0 emission is missed.
          selectWalletById$: hot('a-a', {
            a: (walletId: string) =>
              walletId === destinationWalletId ? destinationWallet : undefined,
          }),
        },
        cardanoContext: {
          selectBlockchainNetworkId$: hot('a-a', {
            a: BlockchainNetworkId('cardano-mainnet'),
          }) as never,
        },
      },
      dependencies,
      assertion: sideEffect$ => {
        const emissions: { type: string; payload?: unknown }[] = [];
        sideEffect$.subscribe(action => emissions.push(action));
        flush();

        const created = emissions.find(
          ({ type }) => type === 'migrateWallet/destinationCreated',
        );
        expect(created).toBeDefined();
        expect(
          (created?.payload as { destinationWalletId: string })
            .destinationWalletId,
        ).toBe(destinationWalletId);
        expect(
          (created?.payload as { destinationAccountId: string })
            .destinationAccountId,
        ).toBe(destinationAccumulatorId);
      },
    }));
  });

  /**
   * Drives a single onboardingV2.createWalletFailure(reason) through the
   * tracker at the given wizard step and returns everything it emitted.
   */
  const collectCreateWalletFailureEmissions = ({
    reason,
    step,
  }: {
    reason: CreateWalletErrorReason | undefined;
    step: MigrateWalletStep;
  }) => {
    const emissions: { type: string; payload?: unknown }[] = [];

    testSideEffect(makeTrackWalletCreation(), ({ hot, flush }) => ({
      actionObservables: {
        onboardingV2: {
          createWalletSuccess$: hot('------'),
          createWalletFailure$: hot('-a', {
            a: {
              type: 'onboardingV2/createWalletFailure',
              payload: { reason },
            },
          }),
        },
        migrateWallet: {
          destinationCreationStarted$: hot('------') as never,
          sourceImportStarted$: hot('------') as never,
          hwDeviceConnected$: hot('------') as never,
          wizardCancelled$: hot('------') as never,
        },
        accountManagement: {
          hardwareWalletCreationFailed$: hot('------') as never,
        },
      },
      stateObservables: {
        migrateWallet: {
          selectPendingHwSource$: hot('a', { a: undefined }),
          selectStep$: hot('a', { a: step }),
        },
        wallets: {
          selectAll$: hot('a', { a: [] }),
          selectWalletById$: hot('a', { a: () => undefined }),
        },
        cardanoContext: {
          selectBlockchainNetworkId$: hot('a', {
            a: BlockchainNetworkId('cardano-mainnet'),
          }) as never,
        },
      },
      dependencies: trackDependencies(),
      assertion: sideEffect$ => {
        sideEffect$.subscribe(action => emissions.push(action));
        flush();
      },
    }));

    return emissions;
  };

  // Device failures on the onboarding destination path arrive pre-classified
  // (HardwareErrorCategory) and must surface the hw-error copy, matching the
  // settings destination path — the recovery-phrase copy only fits the
  // fresh-phrase reasons.
  it.each([
    ['app-not-open', 'hw-error.app-not-open.subtitle'],
    ['device-locked', 'hw-error.device-locked.subtitle'],
    ['cancelled', 'hw-error.cancelled.subtitle'],
    ['creation-failed', 'migrate-wallet.error.wallet-creation-failed'],
    [undefined, 'migrate-wallet.error.wallet-creation-failed'],
  ] as const)(
    'maps an onboarding destination creation failure (%s) to %s',
    (reason, errorKey) => {
      const stepFailed = collectCreateWalletFailureEmissions({
        reason,
        step: 'creatingDestination',
      }).filter(({ type }) => type === 'migrateWallet/stepFailed');

      expect(stepFailed).toHaveLength(1);
      expect(stepFailed[0]?.payload).toEqual({
        errorKey,
        deviceHintKey: undefined,
      });
    },
  );

  it('ignores a createWalletFailure landing outside the creatingDestination step', () => {
    expect(
      collectCreateWalletFailureEmissions({
        reason: 'app-not-open',
        step: 'review',
      }),
    ).toHaveLength(0);
  });

  it('reports a hardware destination creation failure from accountManagement', () => {
    const dependencies = trackDependencies();

    testSideEffect(makeTrackWalletCreation(), ({ hot, flush }) => ({
      actionObservables: {
        onboardingV2: {
          createWalletSuccess$: hot('---'),
          createWalletFailure$: hot('---'),
        },
        migrateWallet: {
          destinationCreationStarted$: hot('---') as never,
          sourceImportStarted$: hot('---') as never,
          hwDeviceConnected$: hot('---') as never,
          wizardCancelled$: hot('---') as never,
        },
        accountManagement: {
          hardwareWalletCreationFailed$: hot('-a', {
            a: {
              type: 'accountManagement/hardwareWalletCreationFailed',
              payload: { reason: 'generic' },
            },
          }),
        },
      },
      stateObservables: {
        migrateWallet: {
          selectPendingHwSource$: hot('a', { a: undefined }),
          selectStep$: hot('a', { a: 'creatingDestination' }),
        },
        wallets: {
          selectAll$: hot('a', { a: [] }),
          selectWalletById$: hot('a', { a: () => undefined }),
        },
        cardanoContext: {
          selectBlockchainNetworkId$: hot('a', {
            a: BlockchainNetworkId('cardano-mainnet'),
          }) as never,
        },
      },
      dependencies,
      assertion: sideEffect$ => {
        const emissions: { type: string }[] = [];
        sideEffect$.subscribe(action => emissions.push(action));
        flush();

        expect(
          emissions.some(({ type }) => type === 'migrateWallet/stepFailed'),
        ).toBe(true);
      },
    }));
  });

  it('ignores hardware creation failure when not on creatingDestination step', () => {
    const dependencies = trackDependencies();

    testSideEffect(makeTrackWalletCreation(), ({ hot, flush }) => ({
      actionObservables: {
        onboardingV2: {
          createWalletSuccess$: hot('---'),
          createWalletFailure$: hot('---'),
        },
        migrateWallet: {
          destinationCreationStarted$: hot('---') as never,
          sourceImportStarted$: hot('---') as never,
          hwDeviceConnected$: hot('---') as never,
          wizardCancelled$: hot('---') as never,
        },
        accountManagement: {
          hardwareWalletCreationFailed$: hot('-a', {
            a: {
              type: 'accountManagement/hardwareWalletCreationFailed',
              payload: { reason: 'generic' },
            },
          }),
        },
      },
      stateObservables: {
        migrateWallet: {
          selectPendingHwSource$: hot('a', { a: undefined }),
          selectStep$: hot('a', { a: 'idle' }),
        },
        wallets: {
          selectAll$: hot('a', { a: [] }),
          selectWalletById$: hot('a', { a: () => undefined }),
        },
        cardanoContext: {
          selectBlockchainNetworkId$: hot('a', {
            a: BlockchainNetworkId('cardano-mainnet'),
          }) as never,
        },
      },
      dependencies,
      assertion: sideEffect$ => {
        const emissions: { type: string }[] = [];
        sideEffect$.subscribe(action => emissions.push(action));
        flush();

        expect(emissions).toEqual([]);
      },
    }));
  });

  // The hardware analogue of the phrase screen's already-loaded refusal: a
  // device whose account is already a Lace wallet fails the import with
  // 'already-added', and every other category is a retryable creation failure.
  it.each([
    ['already-added', 'migrate-wallet.error.source-already-loaded'],
    ['generic', 'hw-error.generic.subtitle'],
  ])(
    'maps a %s hardware-source import failure to %s',
    (reason, expectedErrorKey) => {
      const dependencies = trackDependencies();

      testSideEffect(makeTrackWalletCreation(), ({ hot, flush }) => ({
        actionObservables: {
          onboardingV2: {
            createWalletSuccess$: hot('---'),
            createWalletFailure$: hot('---'),
          },
          migrateWallet: {
            destinationCreationStarted$: hot('---') as never,
            sourceImportStarted$: hot('---') as never,
            hwDeviceConnected$: hot('---') as never,
            wizardCancelled$: hot('---') as never,
          },
          accountManagement: {
            hardwareWalletCreationFailed$: hot('-a', {
              a: {
                type: 'accountManagement/hardwareWalletCreationFailed',
                payload: { reason },
              },
            }) as never,
          },
        },
        stateObservables: {
          migrateWallet: {
            selectStep$: hot('a', { a: 'importingSource' }),
            selectPendingHwSource$: hot('a', { a: undefined }),
          },
          wallets: {
            selectAll$: hot('a', { a: [] }),
            selectWalletById$: hot('a', { a: () => undefined }),
          },
          cardanoContext: {
            selectBlockchainNetworkId$: hot('a', {
              a: BlockchainNetworkId('cardano-mainnet'),
            }) as never,
          },
        },
        dependencies,
        assertion: sideEffect$ => {
          const emissions: { type: string; payload?: unknown }[] = [];
          sideEffect$.subscribe(action => emissions.push(action));
          flush();

          const failed = emissions.find(
            ({ type }) => type === 'migrateWallet/stepFailed',
          );
          expect(failed?.payload).toMatchObject({
            errorKey: expectedErrorKey,
          });
        },
      }));
    },
  );

  // A locked device or closed app is fixed in hand, so the import waits and
  // re-attempts instead of failing: the importing screen gains the category
  // hint and creation is re-dispatched with the stashed device params.
  it('waits out a locked device and re-attempts the source import', () => {
    const dependencies = trackDependencies();
    const hwSource = {
      optionId: 'ledger',
      device: { id: 'usb-1' },
      blockchainName: 'Cardano',
      walletName: 'Old wallet (migrated)',
    };

    testSideEffect(makeTrackWalletCreation(), ({ hot, expectObservable }) => ({
      actionObservables: {
        onboardingV2: {
          createWalletSuccess$: hot('---'),
          createWalletFailure$: hot('---'),
        },
        migrateWallet: {
          destinationCreationStarted$: hot('---') as never,
          sourceImportStarted$: hot('---') as never,
          hwDeviceConnected$: hot('---') as never,
          wizardCancelled$: hot('---') as never,
        },
        accountManagement: {
          hardwareWalletCreationFailed$: hot('-a', {
            a: {
              type: 'accountManagement/hardwareWalletCreationFailed',
              payload: { reason: 'device-locked' },
            },
          }) as never,
        },
      },
      stateObservables: {
        migrateWallet: {
          selectStep$: hot('a', { a: 'importingSource' }),
          selectPendingHwSource$: hot('a', { a: hwSource }) as never,
        },
        wallets: {
          selectAll$: hot('a', { a: [] }),
          selectWalletById$: hot('a', { a: () => undefined }),
        },
        cardanoContext: {
          selectBlockchainNetworkId$: hot('a', {
            a: BlockchainNetworkId('cardano-mainnet'),
          }) as never,
        },
      },
      dependencies,
      assertion: sideEffect$ => {
        expectObservable(sideEffect$).toBe('-a 2999ms b', {
          a: migrateWalletActions.migrateWallet.sourceImportDeviceWaiting({
            hintKey: 'hw-error.device-locked.subtitle',
          }),
          // Asserted as an exact payload, which is the point: the retry has to
          // reproduce the wizard's own dispatch. Dropping
          // `shouldSuppressSuccessSheet` let a successful retry open
          // add-wallet's success sheet over the still-running wizard.
          b: {
            type: 'accountManagement/attemptCreateHardwareWallet',
            payload: {
              optionId: 'ledger',
              device: { id: 'usb-1' },
              accountIndex: 0,
              derivationType: undefined,
              blockchainName: 'Cardano',
              walletName: 'Old wallet (migrated)',
              shouldSuppressSuccessSheet: true,
            },
          },
        });
      },
    }));
  });

  it('cancelling while waiting on the device stops the pending re-attempt', () => {
    const dependencies = trackDependencies();
    const hwSource = {
      optionId: 'ledger',
      device: { id: 'usb-1' },
      blockchainName: 'Cardano',
    };

    testSideEffect(makeTrackWalletCreation(), ({ hot, expectObservable }) => ({
      actionObservables: {
        onboardingV2: {
          createWalletSuccess$: hot('---'),
          createWalletFailure$: hot('---'),
        },
        migrateWallet: {
          destinationCreationStarted$: hot('---') as never,
          sourceImportStarted$: hot('---') as never,
          hwDeviceConnected$: hot('---') as never,
          wizardCancelled$: hot('- 99ms a', {
            a: migrateWalletActions.migrateWallet.wizardCancelled(),
          }) as never,
        },
        accountManagement: {
          hardwareWalletCreationFailed$: hot('-a', {
            a: {
              type: 'accountManagement/hardwareWalletCreationFailed',
              payload: { reason: 'device-locked' },
            },
          }) as never,
        },
      },
      stateObservables: {
        migrateWallet: {
          selectStep$: hot('a', { a: 'importingSource' }),
          selectPendingHwSource$: hot('a', { a: hwSource }) as never,
        },
        wallets: {
          selectAll$: hot('a', { a: [] }),
          selectWalletById$: hot('a', { a: () => undefined }),
        },
        cardanoContext: {
          selectBlockchainNetworkId$: hot('a', {
            a: BlockchainNetworkId('cardano-mainnet'),
          }) as never,
        },
      },
      dependencies,
      assertion: sideEffect$ => {
        // Only the hint: the 3s re-attempt died with the cancel.
        expectObservable(sideEffect$).toBe('-a', {
          a: migrateWalletActions.migrateWallet.sourceImportDeviceWaiting({
            hintKey: 'hw-error.device-locked.subtitle',
          }),
        });
      },
    }));
  });
});

describe('makeRunDiscovery', () => {
  const sourceGroupedAddress = {
    accountIndex: 0,
    address: sourceAddress,
    index: 0,
    networkId: chainId.networkId,
    rewardAccount: Cardano.RewardAccount(rewardAccount0),
    type: AddressType.External,
    stakeKeyDerivationPath: { index: 0, role: 2 },
  } as unknown as GroupedAddress;

  const sourceContext = (
    utxos: Cardano.Utxo[] = [],
    maxTxSize = protocolParameters.maxTxSize,
  ) => ({
    wallet: createSourceWallet(),
    chainId,
    utxos,
    addresses: [sourceGroupedAddress],
    protocolParameters: { ...protocolParameters, maxTxSize },
    signingAccounts: [
      {
        accountId: sourceAccountId,
        accountIndex: 0,
        extendedAccountPublicKey:
          'xpub1234' as CardanoBip32AccountProps['extendedAccountPublicKey'],
      },
    ],
  });

  const resolveTo = (utxos?: Cardano.Utxo[], maxTxSize?: number) => () =>
    of(sourceContext(utxos, maxTxSize)) as never;

  // Discovery reads one thing off state: the feature flags, which say whether a
  // delegation target exists and so whether the shortfall check reserves for
  // it. No flags → no target → the reserve is zero and the gate is inert.
  const discoveryState = (
    hot: RunHelpers['hot'],
    featureFlags: { key: string }[] = [],
    {
      existingDestination,
      destinationRewardInfo,
    }: {
      /** An EXISTING destination wallet, when the case under test needs one.
       * The default (none) models the wizard-created destination every other
       * test uses, whose accounts do not exist yet. */
      existingDestination?: AnyWallet;
      /** The picked destination account's synced reward state, when the case
       * needs one that already stakes. */
      destinationRewardInfo?: { poolId?: string };
    } = {},
  ) =>
    ({
      features: { selectLoadedFeatures$: hot('a', { a: { featureFlags } }) },
      cardanoContext: {
        selectRewardAccountDetails$: hot('a', {
          a:
            destinationRewardInfo === undefined
              ? {}
              : {
                  [destinationAccountId]: {
                    rewardAccountInfo: destinationRewardInfo,
                  },
                },
        }),
      },
      // Phrase-sourced: no captured device, so the scan derives from the root.
      migrateWallet: {
        selectPendingHwSource$: hot('a', { a: undefined }),
        // Fresh destination: the account mapping starts at its unused 0.
        selectDestinationType$: hot('a', {
          a: existingDestination ? 'existing' : 'fresh',
        }),
        selectDestinationWalletId$: hot('a', {
          a: existingDestination?.walletId,
        }),
        selectDestinationAccountId$: hot('a', { a: destinationAccountId }),
      },
      wallets: {
        selectAll$: hot('a', {
          a: existingDestination ? [existingDestination] : [],
        }),
      },
    } as never);

  /**
   * A Ledger destination that already holds the account the plan will land in.
   * `accountId` matches the wizard's picked destination account so the network
   * lookup resolves.
   */
  const loadedLedgerDestination = (accountIndex: number): AnyWallet =>
    mock<AnyWallet>({
      walletId: WalletId('ledger-destination'),
      type: WalletType.HardwareLedger,
      accounts: [
        {
          accountId: destinationAccountId,
          blockchainName: 'Cardano',
          blockchainNetworkId: CardanoNetworkId(chainId.networkMagic),
          blockchainSpecific: { accountIndex } as CardanoBip32AccountProps,
        },
      ],
    } as unknown as Partial<AnyWallet>);

  /**
   * A destination whose landing account is the PICKED one: no in-memory root
   * and no device export, so freshness cannot be probed and the mapping keeps
   * the picked index (the Keystone shape).
   */
  const fixedIndexDestination = (accountIndex: number): AnyWallet =>
    mock<AnyWallet>({
      walletId: WalletId('keystone-destination'),
      type: WalletType.HardwareKeystone,
      accounts: [
        {
          accountId: destinationAccountId,
          blockchainName: 'Cardano',
          blockchainNetworkId: CardanoNetworkId(chainId.networkMagic),
          blockchainSpecific: { accountIndex } as CardanoBip32AccountProps,
        },
      ],
    } as unknown as Partial<AnyWallet>);

  const loggerMock = () => ({
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
  });

  const rewardInfoResult = (overrides: Partial<RewardAccountInfo>) =>
    Ok({
      isActive: true,
      isRegistered: true,
      rewardsSum: BigNumber(0n),
      withdrawableAmount: BigNumber(0n),
      controlledAmount: BigNumber(0n),
      ...overrides,
    });

  const sourceImportedMarble = (hot: RunHelpers['hot']) => ({
    migrateWallet: {
      sourceImported$: hot('-a', {
        a: migrateWalletActions.migrateWallet.sourceImported({
          sourceWalletId,
          sourceAccountId,
          sourceNetworkType: 'mainnet',
        }),
      }),
      // Never fires here: every test in this block drives discovery from the
      // import. The stream still has to exist — the side effect merges it.
      discoveryRetryRequested$: hot('---') as never,
      loadedSourceChosen$: hot('---') as never,
      wizardCancelled$: hot('---') as never,
    },
  });

  it('runs discovery for a loaded source chosen without an import', () => {
    // A loaded wallet skips the import step entirely, so its selection action
    // has to reach the same discovery pipeline the import feeds.
    testSideEffect(
      makeRunDiscovery({ resolveSourceContext: resolveTo() }),
      ({ hot, flush }) => ({
        actionObservables: {
          migrateWallet: {
            sourceImported$: hot('---') as never,
            loadedSourceChosen$: hot('-a', {
              a: migrateWalletActions.migrateWallet.loadedSourceChosen({
                sourceWalletId,
                sourceAccountId,
                sourceNetworkType: 'mainnet',
              }),
            }),
            discoveryRetryRequested$: hot('---') as never,
            wizardCancelled$: hot('---') as never,
          },
        },
        stateObservables: discoveryState(hot),
        dependencies: {
          logger: loggerMock(),
          cardanoProvider: {
            getAccountUtxos: vi.fn().mockReturnValue(of(Ok([]))),
            getRewardAccountInfo: vi
              .fn()
              .mockReturnValue(of(rewardInfoResult({ isRegistered: false }))),
          } as unknown as Mocked<CardanoProvider>,
          actions,
        },
        assertion: sideEffect$ => {
          const emissions: { type: string }[] = [];
          sideEffect$.subscribe(action => emissions.push(action));
          flush();

          expect(emissions.map(({ type }) => type)).toContain(
            'migrateWallet/discoveryCompleted',
          );
        },
      }),
    );
  });

  it('re-runs discovery on discoveryRetryRequested, not only on the import', () => {
    // The retry has to reach the same pipeline: routing a discovery failure to
    // cancel is what left the imported source with no in-flow way forward.
    testSideEffect(
      makeRunDiscovery({ resolveSourceContext: resolveTo() }),
      ({ hot, flush }) => ({
        actionObservables: {
          migrateWallet: {
            sourceImported$: hot('---') as never,
            loadedSourceChosen$: hot('---') as never,
            discoveryRetryRequested$: hot('-a', {
              a: migrateWalletActions.migrateWallet.discoveryRetryRequested({
                sourceWalletId,
                sourceAccountId,
                sourceNetworkType: 'mainnet',
              }),
            }),
            wizardCancelled$: hot('---') as never,
          },
        },
        stateObservables: discoveryState(hot),
        dependencies: {
          logger: loggerMock(),
          cardanoProvider: {
            getAccountUtxos: vi.fn().mockReturnValue(of(Ok([]))),
            getRewardAccountInfo: vi
              .fn()
              .mockReturnValue(of(rewardInfoResult({ isRegistered: false }))),
          } as unknown as Mocked<CardanoProvider>,
          actions,
        },
        assertion: sideEffect$ => {
          const emissions: { type: string }[] = [];
          sideEffect$.subscribe(action => emissions.push(action));
          flush();

          expect(emissions.map(({ type }) => type)).toContain(
            'migrateWallet/discoveryCompleted',
          );
        },
      }),
    );
  });

  it('refuses when the source has withdrawable rewards but was never vote-delegated (S8)', () => {
    testSideEffect(
      makeRunDiscovery({ resolveSourceContext: resolveTo() }),
      ({ hot, expectObservable }) => ({
        actionObservables: sourceImportedMarble(hot),
        stateObservables: discoveryState(hot),
        dependencies: {
          logger: loggerMock(),
          cardanoProvider: {
            getAccountUtxos: vi.fn().mockReturnValue(of(Ok([]))),
            getRewardAccountInfo: vi.fn().mockReturnValue(
              of(
                // withdrawable rewards, no drepId means never vote-delegated
                rewardInfoResult({ withdrawableAmount: BigNumber(1_500_000n) }),
              ),
            ),
          } as unknown as Mocked<CardanoProvider>,
          actions,
        },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('-a', {
            a: migrateWalletActions.migrateWallet.migrationUnsupported({
              errorKey: 'migrate-wallet.error.rewards-not-vote-delegated',
              amount: {
                value: '1500000',
                labelKey: 'migrate-wallet.unsupported.stuck-rewards',
              },
            }),
          });
        },
      }),
    );
  });

  it('skips the build for blocked rewards even when the source has UTxOs', () => {
    // Isolates the blocked-rewards half of the skip-the-build gate: with UTxOs
    // present, only that clause can skip the build. Building anyway would let a
    // build error downgrade this permanent refusal into a retryable failure.
    const buildTxFunction = vi.fn();
    testSideEffect(
      makeRunDiscovery({
        resolveSourceContext: resolveTo(basePlan.utxos),
        buildTxFunction,
      }),
      ({ hot, flush }) => ({
        actionObservables: sourceImportedMarble(hot),
        stateObservables: discoveryState(hot),
        dependencies: {
          logger: loggerMock(),
          cardanoProvider: {
            getAccountUtxos: vi.fn().mockReturnValue(of(Ok([]))),
            getRewardAccountInfo: vi.fn().mockReturnValue(
              of(
                // withdrawable rewards, no drepId means never vote-delegated
                rewardInfoResult({ withdrawableAmount: BigNumber(1_500_000n) }),
              ),
            ),
          } as unknown as Mocked<CardanoProvider>,
          actions,
        },
        assertion: sideEffect$ => {
          const emissions: { type: string }[] = [];
          sideEffect$.subscribe(action => emissions.push(action));
          flush();

          expect(emissions.map(({ type }) => type)).toEqual([
            'migrateWallet/migrationUnsupported',
          ]);
          expect(buildTxFunction).not.toHaveBeenCalled();
        },
      }),
    );
  });

  it('proceeds to discovery when withdrawable rewards are vote-delegated to a placeholder', async () => {
    const prebuiltTx = await buildSweepTx(basePlan);
    testSideEffect(
      makeRunDiscovery({
        resolveSourceContext: resolveTo(basePlan.utxos),
        buildTxFunction: () => of(prebuiltTx),
      }),
      ({ hot, flush }) => ({
        actionObservables: sourceImportedMarble(hot),
        stateObservables: discoveryState(hot),
        dependencies: {
          logger: loggerMock(),
          cardanoProvider: {
            getAccountUtxos: vi.fn().mockReturnValue(of(Ok([]))),
            getRewardAccountInfo: vi.fn().mockReturnValue(
              of(
                rewardInfoResult({
                  withdrawableAmount: BigNumber(1_500_000n),
                  drepId: DREP_ALWAYS_ABSTAIN,
                }),
              ),
            ),
          } as unknown as Mocked<CardanoProvider>,
          actions,
        },
        assertion: sideEffect$ => {
          const emissions: { type: string }[] = [];
          sideEffect$.subscribe(action => emissions.push(action));
          flush();

          const types = emissions.map(({ type }) => type);
          expect(types).toContain('migrateWallet/discoveryCompleted');
          expect(types).not.toContain('migrateWallet/migrationUnsupported');
        },
      }),
    );
  });

  it('surfaces a reward-fetch error as a retryable failure, not an unsupported refusal', () => {
    testSideEffect(
      makeRunDiscovery({ resolveSourceContext: resolveTo() }),
      ({ hot, flush }) => ({
        actionObservables: sourceImportedMarble(hot),
        stateObservables: discoveryState(hot),
        dependencies: {
          logger: loggerMock(),
          cardanoProvider: {
            getAccountUtxos: vi.fn().mockReturnValue(of(Ok([]))),
            getRewardAccountInfo: vi
              .fn()
              .mockReturnValue(of(Err(new Error('provider down')))),
          } as unknown as Mocked<CardanoProvider>,
          actions,
        },
        assertion: sideEffect$ => {
          const emissions: { type: string }[] = [];
          sideEffect$.subscribe(action => emissions.push(action));
          flush();

          const types = emissions.map(({ type }) => type);
          expect(types).toEqual(['migrateWallet/stepFailed']);
          expect(types).not.toContain('migrateWallet/migrationUnsupported');
        },
      }),
    );
  });

  it('aborts on cancel while the reward fetch is in flight, so a late refusal cannot fire', () => {
    testSideEffect(
      makeRunDiscovery({ resolveSourceContext: resolveTo() }),
      ({ hot, cold, flush }) => ({
        actionObservables: {
          migrateWallet: {
            sourceImported$: hot('-a', {
              a: migrateWalletActions.migrateWallet.sourceImported({
                sourceWalletId,
                sourceAccountId,
                sourceNetworkType: 'mainnet',
              }),
            }),
            discoveryRetryRequested$: hot('---') as never,
            loadedSourceChosen$: hot('---') as never,
            // Cancel (frame 3) lands after import (1) but before the reward
            // fetch resolves (frame 5).
            wizardCancelled$: hot('---c', {
              c: migrateWalletActions.migrateWallet.wizardCancelled(),
            }),
          },
        },
        stateObservables: discoveryState(hot),
        dependencies: {
          logger: loggerMock(),
          cardanoProvider: {
            getAccountUtxos: vi.fn().mockReturnValue(of(Ok([]))),
            getRewardAccountInfo: vi.fn().mockReturnValue(
              cold('----(a|)', {
                a: rewardInfoResult({
                  withdrawableAmount: BigNumber(1_500_000n),
                }),
              }),
            ),
          } as unknown as Mocked<CardanoProvider>,
          actions,
        },
        assertion: sideEffect$ => {
          const emissions: { type: string }[] = [];
          sideEffect$.subscribe(action => emissions.push(action));
          flush();

          expect(emissions).toEqual([]);
        },
      }),
    );
  });

  it('refuses when the sweep cannot cover the fee plus min-ADA (case 6)', () => {
    testSideEffect(
      makeRunDiscovery({
        resolveSourceContext: resolveTo(basePlan.utxos),
        buildTxFunction: () =>
          throwError(
            () =>
              new InputSelectionError(
                InputSelectionFailure.BalanceInsufficient,
                'insufficient',
              ),
          ),
      }),
      ({ hot, expectObservable }) => ({
        actionObservables: sourceImportedMarble(hot),
        stateObservables: discoveryState(hot),
        dependencies: {
          logger: loggerMock(),
          cardanoProvider: {
            getAccountUtxos: vi.fn().mockReturnValue(of(Ok([]))),
            getRewardAccountInfo: vi
              .fn()
              .mockReturnValue(of(rewardInfoResult({}))),
          } as unknown as Mocked<CardanoProvider>,
          actions,
        },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('-a', {
            a: migrateWalletActions.migrateWallet.migrationUnsupported({
              errorKey: 'migrate-wallet.error.cannot-cover-fee',
              amount: {
                // two 5_000_000 UTxOs, no rewards. The 2_000_000 registered-key
                // deposit is excluded: the sweep never claims it (FR-5), so it
                // is not what the fee shortfall is holding up.
                value: '10000000',
                labelKey: 'migrate-wallet.unsupported.stuck-amount',
              },
            }),
          });
        },
      }),
    );
  });

  it('rethrows a non-selection build error to the retryable failure path', () => {
    testSideEffect(
      makeRunDiscovery({
        resolveSourceContext: resolveTo(basePlan.utxos),
        buildTxFunction: () => throwError(() => new Error('boom')),
      }),
      ({ hot, flush }) => ({
        actionObservables: sourceImportedMarble(hot),
        stateObservables: discoveryState(hot),
        dependencies: {
          logger: loggerMock(),
          cardanoProvider: {
            getAccountUtxos: vi.fn().mockReturnValue(of(Ok([]))),
            getRewardAccountInfo: vi
              .fn()
              .mockReturnValue(of(rewardInfoResult({}))),
          } as unknown as Mocked<CardanoProvider>,
          actions,
        },
        assertion: sideEffect$ => {
          const emissions: { type: string }[] = [];
          sideEffect$.subscribe(action => emissions.push(action));
          flush();

          const types = emissions.map(({ type }) => type);
          expect(types).toEqual(['migrateWallet/stepFailed']);
          expect(types).not.toContain('migrateWallet/migrationUnsupported');
        },
      }),
    );
  });

  it('refuses a source with rewards or a deposit but no spendable UTxO (case 3)', () => {
    const buildTxFunction = vi.fn();
    testSideEffect(
      makeRunDiscovery({ resolveSourceContext: resolveTo(), buildTxFunction }),
      ({ hot, expectObservable }) => ({
        actionObservables: sourceImportedMarble(hot),
        stateObservables: discoveryState(hot),
        dependencies: {
          logger: loggerMock(),
          cardanoProvider: {
            getAccountUtxos: vi.fn().mockReturnValue(of(Ok([]))),
            getRewardAccountInfo: vi
              .fn()
              .mockReturnValue(of(rewardInfoResult({}))),
          } as unknown as Mocked<CardanoProvider>,
          actions,
        },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('-a', {
            a: migrateWalletActions.migrateWallet.migrationUnsupported({
              errorKey: 'migrate-wallet.error.no-spendable-input',
              // A registered key with no rewards and no UTxO strands nothing
              // the sweep would have moved, so no amount is disclosed rather
              // than a "0 ADA" card.
              amount: undefined,
            }),
          });
        },
      }),
    );
    expect(buildTxFunction).not.toHaveBeenCalled();
  });

  // The reserve exists so the shortfall is caught BEFORE funds move; without
  // this test the true branch of hasDelegationTarget never runs and the gate
  // can silently die (wrong chainId, flags read off the wrong slice).
  it('refuses through discovery when the arriving funds cannot cover the destination delegation', async () => {
    const smallUtxos = [createUtxo(2_600_000n)];
    const prebuiltTx = await buildSweepTx({
      ...basePlan,
      utxos: smallUtxos,
      rewardInfos: [],
    });
    const fee = prebuiltTx.toCore().body.fee;
    // Premise of the scenario: under the 2.5M reserve but sweepable on its own.
    expect(2_600_000n - fee).toBeLessThan(2_500_000n);

    const delegationFlags = [
      { key: 'EARN_REWARDS' },
      {
        key: 'STAKING_CENTER',
        payload: {
          promotedPools: {
            mainnet: [
              {
                id: 'pool132jxjzyw4awr3s75ltcdx5tv5ecv6m042306l630wqjckhfm32r',
              },
            ],
          },
        },
      },
      {
        key: 'GOVERNANCE_CENTER',
        payload: {
          promotedDreps: {
            mainnet: [
              {
                id: 'drep1y2v8w544v5teexvycd6zqgh2686yz7050tdv834yegpt0gsnampev',
              },
            ],
          },
        },
      },
    ] as { key: string }[];

    testSideEffect(
      makeRunDiscovery({
        resolveSourceContext: resolveTo(smallUtxos),
        buildTxFunction: () => of(prebuiltTx),
      }),
      ({ hot, expectObservable }) => ({
        actionObservables: sourceImportedMarble(hot),
        stateObservables: discoveryState(hot, delegationFlags),
        dependencies: {
          logger: loggerMock(),
          cardanoProvider: {
            getAccountUtxos: vi.fn().mockReturnValue(of(Ok([]))),
            getRewardAccountInfo: vi
              .fn()
              .mockReturnValue(of(rewardInfoResult({}))),
          } as unknown as Mocked<CardanoProvider>,
          actions,
        },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('-a', {
            a: migrateWalletActions.migrateWallet.migrationUnsupported({
              errorKey: 'migrate-wallet.error.cannot-cover-delegation',
              amount: {
                value: `${2_600_000n - fee}`,
                labelKey: 'migrate-wallet.unsupported.stuck-amount',
              },
            }),
          });
        },
      }),
    );
  });

  // The reserve now gates on ANY target shape: with no promoted pool the
  // wizard asks the user to choose one (LW-15293), so the set-up must still be
  // affordable. Without this test the relaxation from pool-gated to
  // target-gated could silently revert.
  it('still reserves for the delegation when the target names no pool (the user will choose one)', async () => {
    const smallUtxos = [createUtxo(2_600_000n)];
    const prebuiltTx = await buildSweepTx({
      ...basePlan,
      utxos: smallUtxos,
      rewardInfos: [],
    });
    const fee = prebuiltTx.toCore().body.fee;
    expect(2_600_000n - fee).toBeLessThan(2_500_000n);

    const dRepOnlyFlags = [
      { key: 'EARN_REWARDS' },
      {
        key: 'GOVERNANCE_CENTER',
        payload: {
          promotedDreps: {
            mainnet: [
              {
                id: 'drep1y2v8w544v5teexvycd6zqgh2686yz7050tdv834yegpt0gsnampev',
              },
            ],
          },
        },
      },
    ] as { key: string }[];

    testSideEffect(
      makeRunDiscovery({
        resolveSourceContext: resolveTo(smallUtxos),
        buildTxFunction: () => of(prebuiltTx),
      }),
      ({ hot, expectObservable }) => ({
        actionObservables: sourceImportedMarble(hot),
        stateObservables: discoveryState(hot, dRepOnlyFlags),
        dependencies: {
          logger: loggerMock(),
          cardanoProvider: {
            getAccountUtxos: vi.fn().mockReturnValue(of(Ok([]))),
            getRewardAccountInfo: vi
              .fn()
              .mockReturnValue(of(rewardInfoResult({}))),
          } as unknown as Mocked<CardanoProvider>,
          actions,
        },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('-a', {
            a: migrateWalletActions.migrateWallet.migrationUnsupported({
              errorKey: 'migrate-wallet.error.cannot-cover-delegation',
              amount: {
                value: `${2_600_000n - fee}`,
                labelKey: 'migrate-wallet.unsupported.stuck-amount',
              },
            }),
          });
        },
      }),
    );

    // The same funded discovery flags the pending choice, so the wizard routes
    // through the pool-choice step before the review.
    testSideEffect(
      makeRunDiscovery({ resolveSourceContext: resolveTo() }),
      ({ hot, flush }) => ({
        actionObservables: sourceImportedMarble(hot),
        stateObservables: discoveryState(hot, dRepOnlyFlags),
        dependencies: {
          logger: loggerMock(),
          cardanoProvider: {
            getAccountUtxos: vi.fn().mockReturnValue(of(Ok([]))),
            getRewardAccountInfo: vi
              .fn()
              .mockReturnValue(of(rewardInfoResult({ isRegistered: false }))),
          } as unknown as Mocked<CardanoProvider>,
          actions,
        },
        assertion: sideEffect$ => {
          const emissions: { type: string; payload?: unknown }[] = [];
          sideEffect$.subscribe(action => emissions.push(action));
          flush();

          const completed = emissions.find(
            ({ type }) => type === 'migrateWallet/discoveryCompleted',
          );
          expect(
            (completed?.payload as { needsPoolChoice?: boolean })
              .needsPoolChoice,
          ).toBe(true);
        },
      }),
    );
  });

  /**
   * The other half of the suppression's gate: a GROWABLE destination lands in
   * a probed fresh account, not the picked one, so the picked account staking
   * says nothing about the landing account — the choice must still be asked.
   * Without the `!canPreserveAccounts` guard this run skipped a needed set-up.
   */
  it('still asks for a pool when a growable destination is picked on a staking account', () => {
    const dRepOnlyFlags = [
      { key: 'EARN_REWARDS' },
      {
        key: 'GOVERNANCE_CENTER',
        payload: {
          promotedDreps: {
            mainnet: [
              {
                id: 'drep1y2v8w544v5teexvycd6zqgh2686yz7050tdv834yegpt0gsnampev',
              },
            ],
          },
        },
      },
    ] as { key: string }[];

    testSideEffect(
      makeRunDiscovery({ resolveSourceContext: resolveTo() }),
      ({ hot, flush }) => ({
        actionObservables: sourceImportedMarble(hot),
        stateObservables: discoveryState(hot, dRepOnlyFlags, {
          existingDestination: loadedLedgerDestination(0),
          destinationRewardInfo: { poolId: 'pool1theirs' },
        }),
        dependencies: {
          logger: loggerMock(),
          cardanoProvider: {
            getAccountUtxos: vi.fn().mockReturnValue(of(Ok([]))),
            getRewardAccountInfo: vi
              .fn()
              .mockReturnValue(of(rewardInfoResult({ isRegistered: false }))),
          } as unknown as Mocked<CardanoProvider>,
          actions,
        },
        assertion: sideEffect$ => {
          const emissions: { type: string; payload?: unknown }[] = [];
          sideEffect$.subscribe(action => emissions.push(action));
          flush();

          const completed = emissions.find(
            ({ type }) => type === 'migrateWallet/discoveryCompleted',
          );
          expect(completed).toBeDefined();
          expect(
            (completed?.payload as { needsPoolChoice?: boolean })
              .needsPoolChoice,
          ).toBe(true);
        },
      }),
    );
  });

  /**
   * The fixed-index landing (no root to derive from, no device export to probe
   * with) is the one path where the landing account is the user's picked,
   * possibly already-staking account. Asking there collects a pool the
   * transaction provably discards — delegationPlan never moves an existing
   * delegation — so the pick vanished between the choice screen and the review
   * (LW-15312).
   */
  it('skips the pool choice when the fixed landing account already stakes', () => {
    const dRepOnlyFlags = [
      { key: 'EARN_REWARDS' },
      {
        key: 'GOVERNANCE_CENTER',
        payload: {
          promotedDreps: {
            mainnet: [
              {
                id: 'drep1y2v8w544v5teexvycd6zqgh2686yz7050tdv834yegpt0gsnampev',
              },
            ],
          },
        },
      },
    ] as { key: string }[];

    testSideEffect(
      makeRunDiscovery({ resolveSourceContext: resolveTo() }),
      ({ hot, flush }) => ({
        actionObservables: sourceImportedMarble(hot),
        stateObservables: discoveryState(hot, dRepOnlyFlags, {
          existingDestination: fixedIndexDestination(0),
          destinationRewardInfo: { poolId: 'pool1theirs' },
        }),
        dependencies: {
          logger: loggerMock(),
          cardanoProvider: {
            getAccountUtxos: vi.fn().mockReturnValue(of(Ok([]))),
            getRewardAccountInfo: vi
              .fn()
              .mockReturnValue(of(rewardInfoResult({ isRegistered: false }))),
          } as unknown as Mocked<CardanoProvider>,
          actions,
        },
        assertion: sideEffect$ => {
          const emissions: { type: string; payload?: unknown }[] = [];
          sideEffect$.subscribe(action => emissions.push(action));
          flush();

          const completed = emissions.find(
            ({ type }) => type === 'migrateWallet/discoveryCompleted',
          );
          expect(completed).toBeDefined();
          expect(
            (completed?.payload as { needsPoolChoice?: boolean })
              .needsPoolChoice,
          ).toBe(false);
        },
      }),
    );
  });

  /**
   * The rule discovery applies: an account migrates in preserve mode only if
   * its own UTxOs can fund its own transaction, reward withdrawal included. The
   * per-account dry build IS that test.
   *
   * Real timers, not marbles: the per-account builds are settled through a
   * promise, which virtual time never resolves.
   *
   * What this pins is that one account's failure is a fact about that account.
   * The builds used to run under `Promise.all`, so a single unfundable account
   * rejected the batch and the whole estimate was discarded — leaving that
   * account marked migratable, promised on the review, and failing the build at
   * sweep time, which took the entire migration with it.
   */
  it('marks an account that cannot fund its own transaction unmigratable, without losing the others', async () => {
    const prebuiltTx = await buildSweepTx(basePlan);
    // Account 0 comfortable at its own address; account 1 holding dust at
    // another. Both are funded, so the old utxoCount proxy accepted both.
    const dustAddress = destinationAddress;
    const addresses = [
      sourceGroupedAddress,
      {
        ...sourceGroupedAddress,
        accountIndex: 1,
        address: dustAddress,
        rewardAccount: Cardano.RewardAccount(rewardAccount1),
      } as unknown as GroupedAddress,
    ];
    const richUtxo = createUtxo(10_000_000n);
    const dustUtxo = [
      { txId: utxoTxId, index: 1 },
      { address: dustAddress, value: { coins: 200_000n } },
    ] as unknown as Cardano.Utxo;

    // Only account 1's own build fails. The consolidated build sees both UTxOs
    // and succeeds, so the refusal is per-account, not wallet-wide.
    const buildTxFunction = vi.fn((plan: SweepPlan) =>
      plan.utxos.length === 1 && `${plan.utxos[0][1].address}` === dustAddress
        ? throwError(() => new Error('Insufficient ADA to cover the fee'))
        : of(prebuiltTx),
    );

    const emissions: { type: string; payload?: unknown }[] = [];
    const trigger = new Subject<
      ReturnType<typeof migrateWalletActions.migrateWallet.sourceImported>
    >();
    const sub = makeRunDiscovery({
      resolveSourceContext: () =>
        of({
          ...sourceContext([richUtxo, dustUtxo]),
          addresses,
        }) as never,
      buildTxFunction,
    })(
      {
        migrateWallet: {
          sourceImported$: trigger.asObservable(),
          discoveryRetryRequested$: NEVER,
          loadedSourceChosen$: NEVER,
          wizardCancelled$: NEVER,
        },
      } as never,
      {
        features: { selectLoadedFeatures$: of({ featureFlags: [] }) },
        cardanoContext: { selectRewardAccountDetails$: of({}) },
        migrateWallet: {
          selectPendingHwSource$: of(undefined),
          selectDestinationType$: of('fresh'),
          selectDestinationWalletId$: of(undefined),
          selectDestinationAccountId$: of(destinationAccountId),
        },
        wallets: { selectAll$: of([]) },
      } as never,
      {
        logger: loggerMock(),
        cardanoProvider: {
          getAccountUtxos: vi.fn().mockReturnValue(of(Ok([]))),
          getRewardAccountInfo: vi
            .fn()
            .mockReturnValue(of(rewardInfoResult({ isRegistered: false }))),
        } as unknown as Mocked<CardanoProvider>,
        actions,
      } as never,
    ).subscribe(action => emissions.push(action));

    trigger.next(
      migrateWalletActions.migrateWallet.sourceImported({
        sourceWalletId,
        sourceAccountId,
        sourceNetworkType: 'mainnet',
      }),
    );
    await new Promise(resolve => setTimeout(resolve, 2000));
    sub.unsubscribe();

    const completed = emissions.find(
      ({ type }) => type === 'migrateWallet/discoveryCompleted',
    )?.payload as { accountMapping?: AccountMappingEntry[] };
    const verdictByAccount = new Map(
      (completed.accountMapping ?? []).map(row => [
        row.sourceAccountIndex,
        row.canFundOwnTransaction,
      ]),
    );
    expect(verdictByAccount.get(0)).toBe(true);
    expect(verdictByAccount.get(1)).toBe(false);
  });

  /**
   * Each source account's own pool, recorded on its row so preserve mode can
   * leave the account staking where the user put it. Without it the migration
   * moved every account onto one pool — the promoted one, or whichever the user
   * picked — which is the user's delegation being changed by a flow that only
   * asked to move their funds.
   */
  it('records where each source account stakes', async () => {
    const addresses = [
      sourceGroupedAddress,
      {
        ...sourceGroupedAddress,
        accountIndex: 1,
        address: destinationAddress,
        rewardAccount: Cardano.RewardAccount(rewardAccount1),
      } as unknown as GroupedAddress,
    ];
    const richUtxo = createUtxo(10_000_000n);
    const secondUtxo = [
      { txId: utxoTxId, index: 1 },
      { address: destinationAddress, value: { coins: 9_000_000n } },
    ] as unknown as Cardano.Utxo;

    const prebuilt = await buildSweepTx(basePlan);
    const emissions: { type: string; payload?: unknown }[] = [];
    const trigger = new Subject<
      ReturnType<typeof migrateWalletActions.migrateWallet.sourceImported>
    >();
    const sub = makeRunDiscovery({
      resolveSourceContext: () =>
        of({
          ...sourceContext([richUtxo, secondUtxo]),
          addresses,
        }) as never,
      buildTxFunction: () => of(prebuilt),
    })(
      {
        migrateWallet: {
          sourceImported$: trigger.asObservable(),
          discoveryRetryRequested$: NEVER,
          loadedSourceChosen$: NEVER,
          wizardCancelled$: NEVER,
        },
      } as never,
      {
        features: { selectLoadedFeatures$: of({ featureFlags: [] }) },
        cardanoContext: { selectRewardAccountDetails$: of({}) },
        migrateWallet: {
          selectPendingHwSource$: of(undefined),
          selectDestinationType$: of('fresh'),
          selectDestinationWalletId$: of(undefined),
          selectDestinationAccountId$: of(destinationAccountId),
        },
        wallets: { selectAll$: of([]) },
      } as never,
      {
        logger: loggerMock(),
        cardanoProvider: {
          getAccountUtxos: vi.fn().mockReturnValue(of(Ok([]))),
          // Account 0 stakes; account 1 does not. Keyed by reward account,
          // which is how the plan attributes them.
          getRewardAccountInfo: vi.fn(({ rewardAccount }) =>
            of(
              rewardInfoResult(
                `${rewardAccount}` === `${rewardAccount1}`
                  ? { isRegistered: true }
                  : { isRegistered: true, poolId: SOURCE_POOL },
              ),
            ),
          ),
        } as unknown as Mocked<CardanoProvider>,
        actions,
      } as never,
    ).subscribe(action => emissions.push(action));

    trigger.next(
      migrateWalletActions.migrateWallet.sourceImported({
        sourceWalletId,
        sourceAccountId,
        sourceNetworkType: 'mainnet',
      }),
    );
    await new Promise(resolve => setTimeout(resolve, 2000));
    sub.unsubscribe();

    const completed = emissions.find(
      ({ type }) => type === 'migrateWallet/discoveryCompleted',
    )?.payload as { accountMapping?: AccountMappingEntry[] };
    const poolByAccount = new Map(
      (completed.accountMapping ?? []).map(row => [
        row.sourceAccountIndex,
        row.sourcePoolId,
      ]),
    );
    expect(poolByAccount.get(0)).toBe(`${SOURCE_POOL}`);
    // Nothing to preserve, so the target or chosen pool applies to this one.
    expect(poolByAccount.get(1)).toBeUndefined();
  });

  /**
   * FR-13's device gate. A hardware destination can only prove an account is
   * unused by exporting its key on the device, and the probe runs at the
   * device step — so consolidate must ASK for the device even when the planned
   * landing index is already loaded. "Loaded" says nothing about on-chain use:
   * an account Lace holds can have been transacted with by another wallet from
   * the same seed. Skipping the device skipped the probe with it, and the
   * sweep reused an account with history while the review promised a fresh
   * one.
   *
   * Without this test the guard was unexecuted by the whole suite — every
   * other discovery test runs with no destination wallet, so the predicate
   * returned two lines earlier and the fix could be reverted silently.
   */
  it('collects the destination device for a loaded hardware landing index', () => {
    testSideEffect(
      makeRunDiscovery({ resolveSourceContext: resolveTo() }),
      ({ hot, flush }) => ({
        actionObservables: sourceImportedMarble(hot),
        stateObservables: discoveryState(hot, [], {
          existingDestination: loadedLedgerDestination(0),
        }),
        dependencies: {
          logger: loggerMock(),
          cardanoProvider: {
            getAccountUtxos: vi.fn().mockReturnValue(of(Ok([]))),
            getRewardAccountInfo: vi
              .fn()
              .mockReturnValue(of(rewardInfoResult({ isRegistered: false }))),
          } as unknown as Mocked<CardanoProvider>,
          actions,
        },
        assertion: sideEffect$ => {
          const emissions: { type: string; payload?: unknown }[] = [];
          sideEffect$.subscribe(action => emissions.push(action));
          flush();

          const completed = emissions.find(
            ({ type }) => type === 'migrateWallet/discoveryCompleted',
          );
          expect(
            (completed?.payload as { needsDestinationDevice?: boolean })
              .needsDestinationDevice,
          ).toBe(true);
        },
      }),
    );
  });

  it('completes discovery for an empty wallet rather than refusing', () => {
    const buildTxFunction = vi.fn();
    testSideEffect(
      makeRunDiscovery({ resolveSourceContext: resolveTo(), buildTxFunction }),
      ({ hot, flush }) => ({
        actionObservables: sourceImportedMarble(hot),
        stateObservables: discoveryState(hot),
        dependencies: {
          logger: loggerMock(),
          cardanoProvider: {
            getAccountUtxos: vi.fn().mockReturnValue(of(Ok([]))),
            getRewardAccountInfo: vi
              .fn()
              .mockReturnValue(of(rewardInfoResult({ isRegistered: false }))),
          } as unknown as Mocked<CardanoProvider>,
          actions,
        },
        assertion: sideEffect$ => {
          const emissions: { type: string }[] = [];
          sideEffect$.subscribe(action => emissions.push(action));
          flush();

          const types = emissions.map(({ type }) => type);
          expect(types).toEqual(['migrateWallet/discoveryCompleted']);
          expect(types).not.toContain('migrateWallet/migrationUnsupported');
        },
      }),
    );
    expect(buildTxFunction).not.toHaveBeenCalled();
  });

  it('chunks the sweep when the signed tx would exceed the size cap, proceeding with chunkCount > 1 (FR-6)', async () => {
    // Builds many UTxOs so the combined tx exceeds a lowered maxTxSize.
    // chunkSweepPlan is Promise-based so this test uses Subject-based async
    // testing instead of the synchronous marble scheduler.
    const manyUtxos = Array.from({ length: 50 }, (_, index) =>
      createUtxo(2_000_000n, undefined, index),
    );
    // Build the full tx to measure its size, then set the cap below it.
    const fullTx = await buildSweepTx({
      ...basePlan,
      utxos: manyUtxos,
      rewardInfos: [],
    });
    const fullSize = estimateSignedTxSize(fullTx, manyUtxos);
    // Cap at half the full size so chunking produces ≥ 2 chunks.
    const cappedMaxTxSize = Math.floor(fullSize / 2);

    const trigger = new Subject<unknown>();
    const sideEffect = makeRunDiscovery({
      resolveSourceContext: resolveTo(manyUtxos, cappedMaxTxSize),
      scanActiveAccounts$: () =>
        of({
          resolutions: [],
          scannedThroughAccountIndex: 0,
          scriptUtxoCount: 0,
        }),
    });

    const deps = {
      logger: loggerMock(),
      cardanoProvider: {
        getRewardAccountInfo: vi.fn().mockReturnValue(of(rewardInfoResult({}))),
        getAccountUtxos: vi.fn().mockReturnValue(of(Ok([]))),
      } as unknown as Mocked<CardanoProvider>,
      actions,
    };

    const actionObservables = {
      migrateWallet: {
        sourceImported$: trigger.asObservable() as never,
        loadedSourceChosen$: NEVER as never,
        discoveryRetryRequested$: NEVER as never,
        wizardCancelled$: NEVER as never,
      },
    };

    const emissions: { type: string; payload?: unknown }[] = [];
    const output$ = sideEffect(
      actionObservables as never,
      {
        features: { selectLoadedFeatures$: of({ featureFlags: [] }) },
        cardanoContext: { selectRewardAccountDetails$: of({}) },
        migrateWallet: {
          selectPendingHwSource$: of(undefined),
          selectDestinationType$: of('fresh'),
          selectDestinationWalletId$: of(undefined),
          selectDestinationAccountId$: of(destinationAccountId),
        },
        wallets: { selectAll$: of([]) },
      } as never,
      deps as never,
    );
    const sub = output$.subscribe(action => emissions.push(action));

    trigger.next(
      migrateWalletActions.migrateWallet.sourceImported({
        sourceWalletId,
        sourceAccountId,
        sourceNetworkType: 'mainnet',
      }),
    );

    // Allow async chunking (Promise-based) to settle.
    await new Promise(r => setTimeout(r, 2000));

    const types = emissions.map(({ type }) => type);
    // FR-6: the oversized sweep is chunked, not refused.
    expect(types).toContain('migrateWallet/discoveryCompleted');
    expect(types).not.toContain('migrateWallet/migrationUnsupported');
    // Verify chunkCount > 1 in the discovery payload.
    const completed = emissions.find(
      ({ type }) => type === 'migrateWallet/discoveryCompleted',
    );
    expect(
      (completed?.payload as { discovery: { chunkCount: number } })?.discovery
        ?.chunkCount,
    ).toBeGreaterThan(1);
    sub.unsubscribe();
    // Builds and measures a real oversized sweep plus every chunk, so this one
    // runs in seconds rather than milliseconds and overruns the default budget
    // on a contended runner.
  }, 20000);

  it('collects an additional active account into the sweep instead of refusing', async () => {
    const prebuiltTx = await buildSweepTx(basePlan);
    const resolution: AccountResolution = {
      accountId: AccountId('source-account-1'),
      accountIndex: 1,
      extendedAccountPublicKey: 'xpub1' as Bip32PublicKeyHex,
      addresses: [{ ...sourceGroupedAddress, accountIndex: 1 }],
      // A distinct UTxO (index 2) so the merged set has no duplicate TxIn.
      utxos: [createUtxo(5_000_000n, undefined, 2)],
    };
    testSideEffect(
      makeRunDiscovery({
        resolveSourceContext: resolveTo(basePlan.utxos),
        buildTxFunction: () => of(prebuiltTx),
        // No cast: the shape must satisfy ActiveAccountScanResult so a newly
        // required field cannot be silently omitted here.
        scanActiveAccounts$: () =>
          of({
            resolutions: [resolution],
            scannedThroughAccountIndex: 1,
            scriptUtxoCount: 3,
          }),
      }),
      ({ hot, flush }) => ({
        actionObservables: sourceImportedMarble(hot),
        stateObservables: discoveryState(hot),
        dependencies: {
          logger: loggerMock(),
          cardanoProvider: {
            getAccountUtxos: vi.fn().mockReturnValue(of(Ok([]))),
            getRewardAccountInfo: vi
              .fn()
              .mockReturnValue(of(rewardInfoResult({ isRegistered: true }))),
          } as unknown as Mocked<CardanoProvider>,
          actions,
        },
        assertion: sideEffect$ => {
          const emissions: { type: string; payload?: unknown }[] = [];
          sideEffect$.subscribe(action => emissions.push(action));
          flush();
          // A second active account is swept, not refused.
          expect(emissions.map(({ type }) => type)).toEqual([
            'migrateWallet/discoveryCompleted',
          ]);
          // Coverage data threads through: account 0 plus the scanned account 1,
          // and the scan frontier from the injected result.
          expect(
            (
              emissions[0].payload as {
                discovery: {
                  sweptAccountCount: number;
                  scannedThroughAccountIndex: number;
                  scriptUtxoCount: number;
                };
              }
            ).discovery,
          ).toMatchObject({
            sweptAccountCount: 2,
            scannedThroughAccountIndex: 1,
            scriptUtxoCount: 3,
          });
        },
      }),
    );
  });

  it('proceeds to discovery when no additional account is active', () => {
    testSideEffect(
      makeRunDiscovery({
        resolveSourceContext: resolveTo(),
        buildTxFunction: vi.fn(),
        scanActiveAccounts$: () =>
          of({
            resolutions: [],
            scannedThroughAccountIndex: 10,
            scriptUtxoCount: 0,
          }),
      }),
      ({ hot, flush }) => ({
        actionObservables: sourceImportedMarble(hot),
        stateObservables: discoveryState(hot),
        dependencies: {
          logger: loggerMock(),
          cardanoProvider: {
            getAccountUtxos: vi.fn().mockReturnValue(of(Ok([]))),
            getRewardAccountInfo: vi
              .fn()
              .mockReturnValue(of(rewardInfoResult({ isRegistered: false }))),
          } as unknown as Mocked<CardanoProvider>,
          actions,
        },
        assertion: sideEffect$ => {
          const emissions: { type: string }[] = [];
          sideEffect$.subscribe(action => emissions.push(action));
          flush();

          expect(emissions.map(({ type }) => type)).toEqual([
            'migrateWallet/discoveryCompleted',
          ]);
        },
      }),
    );
  });

  it('adds the source account script-locked count to the scanned accounts total', () => {
    // Account 0's dropped set never reaches the store, so the count is read back
    // from the provider. Without this the common single-account wallet would
    // disclose nothing before an irreversible sweep.
    const scriptUtxo = [
      {},
      {
        address: Cardano.PaymentAddress(
          'addr_test1zqwk0nt6a2hdae87w0k240nuezf2fra52qgemksdm4m0jftuzcjqw982pcftgx53fu5527z2cj2tkx2h8ux2vxsg475q5jdz53',
        ),
      },
    ] as unknown as Cardano.Utxo;
    testSideEffect(
      makeRunDiscovery({
        resolveSourceContext: resolveTo(),
        buildTxFunction: vi.fn(),
        scanActiveAccounts$: () =>
          of({
            resolutions: [],
            scannedThroughAccountIndex: 10,
            // Two from the scanned accounts, one from account 0 below.
            scriptUtxoCount: 2,
          }),
      }),
      ({ hot, flush }) => ({
        actionObservables: sourceImportedMarble(hot),
        stateObservables: discoveryState(hot),
        dependencies: {
          logger: loggerMock(),
          cardanoProvider: {
            getRewardAccountInfo: vi
              .fn()
              .mockReturnValue(of(rewardInfoResult({ isRegistered: false }))),
            getAccountUtxos: vi.fn().mockReturnValue(of(Ok([scriptUtxo]))),
          } as unknown as Mocked<CardanoProvider>,
          actions,
        },
        assertion: sideEffect$ => {
          const emissions: { type: string; payload?: unknown }[] = [];
          sideEffect$.subscribe(action => emissions.push(action));
          flush();

          expect(
            (emissions[0].payload as { discovery: { scriptUtxoCount: number } })
              .discovery.scriptUtxoCount,
          ).toBe(3);
        },
      }),
    );
  });

  it('fails discovery instead of hanging forever when the account scan never resolves', () => {
    // A scan that never emits models a stuck or rate-limited provider. Only the
    // context resolution had a deadline before this fix, so the scan and
    // everything chained after it could hang past `discovering` with
    // cancelling as the only exit. testSideEffect runs on virtual time, so the
    // 180 second deadline below costs no real time.
    testSideEffect(
      makeRunDiscovery({
        resolveSourceContext: resolveTo(),
        scanActiveAccounts$: () => NEVER,
      }),
      ({ hot, flush }) => ({
        actionObservables: sourceImportedMarble(hot),
        stateObservables: discoveryState(hot),
        dependencies: {
          logger: loggerMock(),
          cardanoProvider: {
            getAccountUtxos: vi.fn().mockReturnValue(of(Ok([]))),
            getRewardAccountInfo: vi.fn(),
          } as unknown as Mocked<CardanoProvider>,
          actions,
        },
        assertion: sideEffect$ => {
          const emissions: { type: string }[] = [];
          sideEffect$.subscribe(action => emissions.push(action));
          flush();

          expect(emissions).toEqual([
            migrateWalletActions.migrateWallet.stepFailed({
              errorKey: 'migrate-wallet.error.discovery-failed',
            }),
          ]);
        },
      }),
    );
  });
  // A hardware source: discovery probes accounts 1+ on the device the wizard
  // captured, and every active account the scan finds is persisted onto the
  // wallet entry BEFORE review — the signer factory can only sign for accounts
  // the wallet holds, so an unpersisted account would make the sweep
  // unsignable.
  it('probes a hardware source on its device and persists the active accounts it finds', async () => {
    const hwAccountEntity = (accountIndex: number) => ({
      accountId: AccountId(`hw-acct-${accountIndex}`),
      accountIndex,
      blockchainNetworkId: BlockchainNetworkId('cardano-mainnet'),
      blockchainSpecific: {
        extendedAccountPublicKey: `device-xpub-${accountIndex}`,
      },
    });
    const storedAccount = {
      accountId: sourceAccountId,
      accountIndex: 0,
      blockchainNetworkId: BlockchainNetworkId('cardano-mainnet'),
    };
    const hwWallet = {
      walletId: sourceWalletId,
      type: 'HardwareLedger',
      accounts: [storedAccount],
      blockchainSpecific: {},
    };
    const hwContext = { ...sourceContext([]), wallet: hwWallet as never };

    const resolution: AccountResolution = {
      accountId: AccountId('hw-acct-1'),
      accountIndex: 1,
      extendedAccountPublicKey: 'device-xpub-1' as Bip32PublicKeyHex,
      addresses: [{ ...sourceGroupedAddress, accountIndex: 1 }],
      utxos: [],
    };
    // The stub consumes the device exporter exactly like the real scan: the
    // export is what fills the device source's cache with the entities the
    // merge persists.
    const scanStub: ActiveAccountScan = input =>
      from(
        (async () => {
          expect(input.deviceXpubSource).toBeDefined();
          await input.deviceXpubSource!(1);
          return {
            resolutions: [resolution],
            scannedThroughAccountIndex: 11,
            scriptUtxoCount: 0,
          };
        })(),
      );

    const connectHardwareAccounts = vi.fn(
      async (_state: unknown, { accountIndex }: { accountIndex: number }) => [
        hwAccountEntity(accountIndex),
      ],
    );
    const trigger = new Subject<
      ReturnType<typeof migrateWalletActions.migrateWallet.sourceImported>
    >();
    const emissions: { type: string; payload?: unknown }[] = [];
    const sub = makeRunDiscovery({
      resolveSourceContext: () => of(hwContext) as never,
      scanActiveAccounts$: scanStub,
    })(
      {
        migrateWallet: {
          sourceImported$: trigger.asObservable() as never,
          loadedSourceChosen$: NEVER as never,
          discoveryRetryRequested$: NEVER as never,
          wizardCancelled$: NEVER as never,
        },
      } as never,
      {
        features: { selectLoadedFeatures$: of({ featureFlags: [] }) },
        cardanoContext: { selectRewardAccountDetails$: of({}) },
        migrateWallet: {
          selectPendingHwSource$: of({
            optionId: 'ledger',
            device: { id: 'usb-1' },
            blockchainName: 'Cardano',
          }),
          selectDestinationType$: of('fresh'),
          selectDestinationWalletId$: of(undefined),
          selectDestinationAccountId$: of(destinationAccountId),
        },
        wallets: { selectAll$: of([]) },
      } as never,
      {
        logger: loggerMock(),
        cardanoProvider: {
          getRewardAccountInfo: vi
            .fn()
            .mockReturnValue(
              of(rewardInfoResult({ isActive: false, isRegistered: false })),
            ),
          getAccountUtxos: vi.fn().mockReturnValue(of(Ok([]))),
        } as unknown as Mocked<CardanoProvider>,
        actions,
        loadModules: vi.fn(async () => [
          [{ blockchainName: 'Cardano', connectHardwareAccounts }],
        ]),
        __getState: () => ({}),
      } as never,
    ).subscribe(action => emissions.push(action));

    trigger.next(
      migrateWalletActions.migrateWallet.sourceImported({
        sourceWalletId,
        sourceAccountId,
        sourceNetworkType: 'mainnet',
      }),
    );
    await new Promise(resolve => setTimeout(resolve, 100));

    const types = emissions.map(({ type }) => type);
    expect(types).toContain('wallets/updateWallet');
    expect(types).toContain('migrateWallet/discoveryCompleted');
    // Persisted before review, so the plan the user confirms is signable.
    expect(types.indexOf('wallets/updateWallet')).toBeLessThan(
      types.indexOf('migrateWallet/discoveryCompleted'),
    );
    const updated = emissions.find(
      ({ type }) => type === 'wallets/updateWallet',
    );
    expect(updated?.payload).toMatchObject({
      id: sourceWalletId,
      changes: { accounts: [storedAccount, hwAccountEntity(1)] },
    });
    // The device was consulted for the probe: family connector resolved and
    // called with the captured descriptor.
    expect(connectHardwareAccounts).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ device: { id: 'usb-1' }, accountIndex: 1 }),
    );
    sub.unsubscribe();
  });
});
