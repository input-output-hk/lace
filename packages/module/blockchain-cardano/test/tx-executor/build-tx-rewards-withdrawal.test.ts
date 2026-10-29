// A send whose UTxOs cannot fund it withdraws the account's staking rewards
// (LW-15725), but only when the caller allows it and the ledger would accept
// the withdrawal. Uses the real TransactionBuilder: the assertions are on the
// built transaction body, not on a mocked build result.
import { Cardano, Serialization } from '@cardano-sdk/core';
import { Hash28ByteBase16 } from '@cardano-sdk/crypto';
import {
  TransactionBuilder,
  pendingRewardWithdrawalKey,
} from '@lace-contract/cardano-context';
import { AccountId } from '@lace-contract/wallet-repo';
import { BigNumber } from '@lace-lib/util';
import { firstValueFrom, of } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { makeTxExecutor } from '../../src/tx-executor-implementation';
import {
  makeBuildTx,
  makePreviewTx,
} from '../../src/tx-executor-implementation/build-tx';
import { resolveRewardWithdrawal } from '../../src/tx-executor-implementation/reward-withdrawal';

import type { AnyAddress } from '@lace-contract/addresses';
import type {
  AccountRewardAccountDetailsMap,
  PendingRewardWithdrawals,
  RequiredProtocolParameters,
  RewardAccountInfo,
} from '@lace-contract/cardano-context';
import type { SideEffectDependencies } from '@lace-contract/module';
import type {
  TokenTransfer,
  TxExecutorImplementation,
} from '@lace-contract/tx-executor';

type BuildTxParamsShape = Parameters<TxExecutorImplementation['buildTx']>[0];

const accountId = AccountId('test-account');
// Base address with a key-hash stake credential.
const ownAddress =
  'addr_test1qz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj83ws8lhrn648jjxtwq2ytjqp';
const recipient =
  'addr_test1qrtdjvvgalpl5pxqftpf5n6mz23ksvg3gwle040z7jarvxquvv2ng0zzk9yx3q627wnledw8gsy9vuljaw0j9vyjs2yqjjnenn';

const rewardAccountOf = (address: string): Cardano.RewardAccount => {
  const stakeCredential = Cardano.Address.fromBech32(address)
    .asBase()!
    .getStakeCredential();
  return Cardano.RewardAccount.fromCredential(
    stakeCredential,
    Cardano.NetworkId.Testnet,
  );
};
const ownRewardAccount = rewardAccountOf(ownAddress);

// The same payment key, staked to a script: a send cannot witness that.
const scriptStakedAddress = Cardano.BaseAddress.fromCredentials(
  Cardano.NetworkId.Testnet,
  Cardano.Address.fromBech32(ownAddress).asBase()!.getPaymentCredential(),
  {
    type: Cardano.CredentialType.ScriptHash,
    hash: Hash28ByteBase16('1'.repeat(56)),
  },
)
  .toAddress()
  .toBech32();

// Same payment key, another key-hash stake credential: a second reward account.
const otherStakedAddress = Cardano.BaseAddress.fromCredentials(
  Cardano.NetworkId.Testnet,
  Cardano.Address.fromBech32(ownAddress).asBase()!.getPaymentCredential(),
  {
    type: Cardano.CredentialType.KeyHash,
    hash: Hash28ByteBase16('2'.repeat(56)),
  },
)
  .toAddress()
  .toBech32();

const addressEntry = (
  address: string,
  rewardAccount: Cardano.RewardAccount | undefined,
) =>
  ({
    accountId,
    address,
    blockchainName: 'Cardano',
    ...(rewardAccount && { data: { rewardAccount } }),
  } as unknown as AnyAddress);

const protocolParameters: RequiredProtocolParameters = {
  desiredNumberOfPools: 500,
  collateralPercentage: 150,
  maxCollateralInputs: 3,
  monetaryExpansion: '0.003',
  poolInfluence: '0.5',
  dRepDeposit: 500000000,
  minFeeRefScriptCostPerByte: '15',
  coinsPerUtxoByte: 4310,
  maxTxSize: 16384,
  maxValueSize: 5000,
  minFeeCoefficient: 44,
  minFeeConstant: 155381,
  poolDeposit: 500_000_000,
  stakeKeyDeposit: 2_000_000,
  prices: { memory: 0.0577, steps: 0.0000721 },
};

const utxo = (coins: bigint, address = ownAddress): Cardano.Utxo => [
  {
    txId: Cardano.TransactionId('3'.repeat(64)),
    index: 0,
    address: Cardano.PaymentAddress(address),
  },
  { address: Cardano.PaymentAddress(address), value: { coins } },
];

// Pending withdrawals as the executor receives them, on the build's network.
const pendingOn = (
  rewardAccount: Cardano.RewardAccount,
  quantity: bigint,
  networkMagic: Cardano.NetworkMagic = Cardano.NetworkMagics.Preprod,
): PendingRewardWithdrawals =>
  new Map([
    [pendingRewardWithdrawalKey(networkMagic, rewardAccount), quantity],
  ]);

// The LW-15725 customer: one 1.649082 ADA UTxO and 4.765933 ADA of rewards.
const CUSTOMER_UTXO = 1_649_082n;
const CUSTOMER_REWARDS = 4_765_933n;

const rewardInfo = (
  overrides: Partial<RewardAccountInfo> = {},
): AccountRewardAccountDetailsMap =>
  ({
    [accountId]: {
      rewardAccountInfo: {
        controlledAmount: BigNumber(CUSTOMER_UTXO + CUSTOMER_REWARDS),
        drepId: 'drep_always_abstain',
        isActive: true,
        isRegistered: true,
        rewardsSum: BigNumber(CUSTOMER_REWARDS),
        withdrawableAmount: BigNumber(CUSTOMER_REWARDS),
        ...overrides,
      },
    },
  } as AccountRewardAccountDetailsMap);

const setup = ({
  utxos = [utxo(CUSTOMER_UTXO)],
  addresses = [addressEntry(ownAddress, ownRewardAccount)],
  rewardAccountDetails = rewardInfo(),
  pendingRewardWithdrawals = new Map(),
}: {
  utxos?: Cardano.Utxo[];
  addresses?: AnyAddress[];
  rewardAccountDetails?: AccountRewardAccountDetailsMap;
  pendingRewardWithdrawals?: PendingRewardWithdrawals;
} = {}) => {
  const dependencies = {
    txExecutorCardano: {
      cardanoNetworkMagic$: of(Cardano.NetworkMagics.Preprod),
      cardanoProtocolParameters$: of(protocolParameters),
      cardanoAddresses$: of(addresses),
      cardanoRewardAccountDetails$: of(rewardAccountDetails),
    },
  } as unknown as SideEffectDependencies;
  const availableUtxos$ = of({ [accountId]: utxos });
  return {
    buildTx: makeBuildTx(
      dependencies,
      availableUtxos$,
      of(pendingRewardWithdrawals),
    ),
    previewTx: makePreviewTx(
      dependencies,
      availableUtxos$,
      of(pendingRewardWithdrawals),
    ),
  };
};

const sendParams = (
  lovelace: bigint,
  { allowRewardsWithdrawal = true } = {},
): BuildTxParamsShape =>
  ({
    accountId,
    allowRewardsWithdrawal,
    blockchainName: 'Cardano',
    serializedTx: '',
    blockchainSpecificSendFlowData: {},
    txParams: [
      {
        address: recipient,
        tokenTransfers: [
          {
            normalizedAmount: BigNumber(lovelace),
            token: {
              accountId,
              blockchainName: 'Cardano',
              tokenId: 'lovelace',
            },
          } as unknown as TokenTransfer,
        ],
      },
    ],
  } as unknown as BuildTxParamsShape);

const bodyOf = (serializedTx: string) =>
  Serialization.Transaction.fromCbor(
    Serialization.TxCBOR(serializedTx),
  ).toCore().body;

describe('Cardano buildTx: staking rewards fallback', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([1_000_000n, 3_000_000n])(
    'withdraws the whole reward balance when the UTxOs cannot fund %s lovelace',
    async lovelace => {
      const { buildTx } = setup();

      const result = await firstValueFrom(buildTx(sendParams(lovelace)));

      if (!result.success) throw new Error('expected the send to build');
      expect(result.withdrawals).toEqual([
        { amount: BigNumber(CUSTOMER_REWARDS), tokenId: 'lovelace' },
      ]);
      const body = bodyOf(result.serializedTx);
      expect(body.withdrawals).toEqual([
        { quantity: CUSTOMER_REWARDS, stakeAddress: ownRewardAccount },
      ]);
      // Inputs + withdrawal fund the outputs + fee exactly.
      const outputs = body.outputs.reduce(
        (sum, out) => sum + out.value.coins,
        0n,
      );
      expect(CUSTOMER_UTXO + CUSTOMER_REWARDS).toBe(outputs + body.fee);
      expect(
        body.outputs.find(out => out.address === recipient)?.value.coins,
      ).toBe(lovelace);
    },
  );

  // 6.415015 ADA in total, minus the fee, leaves less than the minimum change
  // output for a 6 ADA send, and the builder does not add leftovers to the fee.
  it('still fails a send whose change would fall below the minimum, even with rewards', async () => {
    const { buildTx } = setup();

    const result = await firstValueFrom(buildTx(sendParams(6_000_000n)));

    // Amount and fee are covered; the change is not. "Not enough funds to
    // cover the amount and the fee" would be wrong, so the message is generic.
    expect(result).toEqual({
      success: false,
      errorTranslationKey: 'tx-executor.building-error.generic',
    });
  });

  // The coin selector reports BalanceInsufficient only when the funds cannot
  // even cover the amount and fee; a shortfall it meets while funding the
  // change (UtxoFullyDepleted) can also be a change below its minimum, so it
  // stays generic (see the 6 ADA case above).
  it.each([
    [
      'the amount is the whole balance, leaving nothing for the fee (Max)',
      {},
      CUSTOMER_UTXO + CUSTOMER_REWARDS,
    ],
    [
      'the rewards cannot be used (no DRep delegation) and the UTxOs fall short',
      { rewardAccountDetails: rewardInfo({ drepId: undefined }) },
      3_000_000n,
    ],
  ])(
    'says there are not enough funds when %s',
    async (_, options: Parameters<typeof setup>[0], lovelace) => {
      const { buildTx } = setup(options);

      const result = await firstValueFrom(buildTx(sendParams(lovelace)));

      expect(result).toEqual({
        success: false,
        errorTranslationKey: 'tx-executor.building-error.insufficient-funds',
      });
    },
  );

  it('withdraws from the first reward account the addresses name, the one whose balance was fetched', async () => {
    const { buildTx } = setup({
      addresses: [
        addressEntry(recipient, undefined),
        addressEntry(otherStakedAddress, rewardAccountOf(otherStakedAddress)),
        addressEntry(ownAddress, ownRewardAccount),
      ],
    });

    const result = await firstValueFrom(buildTx(sendParams(1_000_000n)));

    if (!result.success) throw new Error('expected the send to build');
    expect(bodyOf(result.serializedTx).withdrawals).toEqual([
      {
        quantity: CUSTOMER_REWARDS,
        stakeAddress: rewardAccountOf(otherStakedAddress),
      },
    ]);
  });

  // The fetched balance is stale until the pending withdrawal settles, and the
  // ledger only accepts the whole on-chain balance: any amount would be wrong.
  it.each([
    ['the whole balance', CUSTOMER_REWARDS],
    ['part of a since-refreshed balance', 1_000_000n],
  ])(
    'does not withdraw again while a pending transaction withdraws %s',
    async (_, pendingQuantity) => {
      const { buildTx, previewTx } = setup({
        pendingRewardWithdrawals: pendingOn(ownRewardAccount, pendingQuantity),
      });
      const build = vi.spyOn(TransactionBuilder.prototype, 'build');
      const addRewardsWithdrawal = vi.spyOn(
        TransactionBuilder.prototype,
        'addRewardsWithdrawal',
      );

      const built = await firstValueFrom(buildTx(sendParams(1_000_000n)));
      const previewed = await firstValueFrom(previewTx(sendParams(1_000_000n)));

      // Each failed on its UTxO-only attempt, with no retry attached.
      expect(built.success).toBe(false);
      expect(previewed.success).toBe(false);
      expect(build).toHaveBeenCalledTimes(2);
      expect(addRewardsWithdrawal).not.toHaveBeenCalled();
    },
  );

  it('still withdraws when the pending amount for the reward account is zero', async () => {
    const { buildTx } = setup({
      pendingRewardWithdrawals: pendingOn(ownRewardAccount, 0n),
    });

    const result = await firstValueFrom(buildTx(sendParams(1_000_000n)));

    if (!result.success) throw new Error('expected the send to build');
    expect(result.withdrawals).toEqual([
      { amount: BigNumber(CUSTOMER_REWARDS), tokenId: 'lovelace' },
    ]);
  });

  // Preview and Preprod share reward addresses: a withdrawal pending on one
  // network must not block the other's.
  it('still withdraws when the same reward account has a withdrawal pending on another network', async () => {
    const { buildTx } = setup({
      pendingRewardWithdrawals: pendingOn(
        ownRewardAccount,
        CUSTOMER_REWARDS,
        Cardano.NetworkMagics.Preview,
      ),
    });

    const result = await firstValueFrom(buildTx(sendParams(1_000_000n)));

    if (!result.success) throw new Error('expected the send to build');
    expect(result.withdrawals).toEqual([
      { amount: BigNumber(CUSTOMER_REWARDS), tokenId: 'lovelace' },
    ]);
  });

  it('still withdraws when the pending withdrawal is from another reward account', async () => {
    const { buildTx } = setup({
      pendingRewardWithdrawals: pendingOn(
        rewardAccountOf(otherStakedAddress),
        CUSTOMER_REWARDS,
      ),
    });

    const result = await firstValueFrom(buildTx(sendParams(1_000_000n)));

    if (!result.success) throw new Error('expected the send to build');
    expect(result.withdrawals).toEqual([
      { amount: BigNumber(CUSTOMER_REWARDS), tokenId: 'lovelace' },
    ]);
  });

  it('builds a UTxO-funded send for an account whose reward details were never fetched', async () => {
    const { buildTx } = setup({
      utxos: [utxo(10_000_000n)],
      rewardAccountDetails: {},
    });

    const result = await firstValueFrom(buildTx(sendParams(3_000_000n)));

    expect(result.success).toBe(true);
  });

  it('does not withdraw when the UTxOs fund the send on their own', async () => {
    const { buildTx } = setup({ utxos: [utxo(10_000_000n)] });

    const result = await firstValueFrom(buildTx(sendParams(3_000_000n)));

    if (!result.success) throw new Error('expected the send to build');
    expect(result.withdrawals).toBeUndefined();
    expect(bodyOf(result.serializedTx).withdrawals).toBeUndefined();
  });

  it('never withdraws when the caller does not allow it', async () => {
    // e.g. the collateral flow, whose sheet does not show withdrawals.
    const { buildTx } = setup();

    const result = await firstValueFrom(
      buildTx(sendParams(1_000_000n, { allowRewardsWithdrawal: false })),
    );

    expect(result.success).toBe(false);
  });

  it.each<[string, Parameters<typeof setup>[0]]>([
    [
      'the stake key has no DRep delegation',
      { rewardAccountDetails: rewardInfo({ drepId: undefined }) },
    ],
    [
      'the stake key is not registered',
      { rewardAccountDetails: rewardInfo({ isRegistered: false }) },
    ],
    [
      'there are no rewards',
      {
        rewardAccountDetails: rewardInfo({ withdrawableAmount: BigNumber(0n) }),
      },
    ],
    ['the reward details were never fetched', { rewardAccountDetails: {} }],
    [
      'no address names a reward account',
      { addresses: [addressEntry(ownAddress, undefined)] },
    ],
    [
      'the stake credential is a script',
      {
        utxos: [utxo(CUSTOMER_UTXO, scriptStakedAddress)],
        addresses: [
          addressEntry(
            scriptStakedAddress,
            rewardAccountOf(scriptStakedAddress),
          ),
        ],
      },
    ],
  ])('keeps the UTxO-only failure when %s', async (_, options) => {
    const { buildTx } = setup(options);

    const result = await firstValueFrom(buildTx(sendParams(1_000_000n)));

    expect(result.success).toBe(false);
  });

  it('does not retry with rewards after a failure that is not a funding shortfall', async () => {
    const { buildTx } = setup();
    // A builder bug (not an InputSelectionError) must surface, not be papered
    // over by a retry that happens to build with a withdrawal.
    vi.spyOn(TransactionBuilder.prototype, 'build').mockRejectedValueOnce(
      new Error('selector returned change below the minimum'),
    );
    const addRewardsWithdrawal = vi.spyOn(
      TransactionBuilder.prototype,
      'addRewardsWithdrawal',
    );

    const result = await firstValueFrom(buildTx(sendParams(1_000_000n)));

    expect(result).toEqual({
      success: false,
      errorTranslationKey: 'tx-executor.building-error.generic',
    });
    expect(addRewardsWithdrawal).not.toHaveBeenCalled();
  });

  it('lets the minimum-amount preview build with the rewards', async () => {
    const { previewTx } = setup();

    const allowed = await firstValueFrom(previewTx(sendParams(1_000_000n)));
    const notAllowed = await firstValueFrom(
      previewTx(sendParams(1_000_000n, { allowRewardsWithdrawal: false })),
    );

    expect(allowed.success).toBe(true);
    expect(notAllowed.success).toBe(false);
  });
});

// The executor gets pending withdrawals from state, as it gets the UTxOs: a
// builder unit fed a stream directly would pass even if this wiring broke.
describe('makeTxExecutor: pending withdrawals from state', () => {
  const executorFor = (pending: PendingRewardWithdrawals) => {
    const dependencies = {
      txExecutorCardano: {
        cardanoNetworkMagic$: of(Cardano.NetworkMagics.Preprod),
        cardanoProtocolParameters$: of(protocolParameters),
        cardanoAddresses$: of([addressEntry(ownAddress, ownRewardAccount)]),
        cardanoRewardAccountDetails$: of(rewardInfo()),
      },
    } as unknown as SideEffectDependencies;
    const utxos$ = of({ [accountId]: [utxo(CUSTOMER_UTXO)] });
    return makeTxExecutor()(dependencies, {
      cardanoContext: {
        selectAvailableAccountUtxos$: utxos$,
        selectCollateralOwnershipUtxos$: utxos$,
        selectPendingRewardWithdrawals$: of(pending),
      },
    } as never);
  };

  it('withdraws when nothing is pending', async () => {
    const executor = executorFor(new Map());

    const built = await firstValueFrom(
      executor.buildTx(sendParams(1_000_000n)),
    );
    const previewed = await firstValueFrom(
      executor.previewTx(sendParams(1_000_000n)),
    );

    expect(built.success).toBe(true);
    expect(previewed.success).toBe(true);
  });

  it('does not withdraw again, in build or preview, while a withdrawal is pending', async () => {
    const executor = executorFor(pendingOn(ownRewardAccount, CUSTOMER_REWARDS));

    const built = await firstValueFrom(
      executor.buildTx(sendParams(1_000_000n)),
    );
    const previewed = await firstValueFrom(
      executor.previewTx(sendParams(1_000_000n)),
    );

    expect(built.success).toBe(false);
    expect(previewed.success).toBe(false);
  });

  it('refuses to start without the pending-withdrawal stream', () => {
    const utxos$ = of({});
    expect(() =>
      makeTxExecutor()(
        {} as SideEffectDependencies,
        {
          cardanoContext: {
            selectAvailableAccountUtxos$: utxos$,
            selectCollateralOwnershipUtxos$: utxos$,
          },
        } as never,
      ),
    ).toThrow(/selectPendingRewardWithdrawals\$/);
  });
});

describe('resolveRewardWithdrawal', () => {
  const resolve = ({
    addresses = [addressEntry(ownAddress, ownRewardAccount)],
    rewardAccountDetails = rewardInfo(),
    pendingRewardWithdrawals = new Map(),
  }: {
    addresses?: AnyAddress[];
    rewardAccountDetails?: AccountRewardAccountDetailsMap;
    pendingRewardWithdrawals?: PendingRewardWithdrawals;
  } = {}) =>
    resolveRewardWithdrawal({
      accountId,
      accountAddresses: addresses,
      rewardAccountDetails,
      pendingRewardWithdrawals,
      networkMagic: Cardano.NetworkMagics.Preprod,
    });

  it('names the reward account and its whole balance', () => {
    expect(resolve()).toEqual({
      amount: CUSTOMER_REWARDS,
      rewardAccount: ownRewardAccount,
    });
  });

  // Each case must resolve to nothing rather than throw: resolution runs
  // before every build, including sends the UTxOs fund on their own.
  it.each<[string, Parameters<typeof resolve>[0]]>([
    [
      'the reward balance is empty (the ledger rejects a zero withdrawal)',
      {
        rewardAccountDetails: rewardInfo({ withdrawableAmount: BigNumber(0n) }),
      },
    ],
    [
      'the stake key has no DRep delegation',
      { rewardAccountDetails: rewardInfo({ drepId: undefined }) },
    ],
    [
      'the stake key is not registered',
      { rewardAccountDetails: rewardInfo({ isRegistered: false }) },
    ],
    ['the reward details were never fetched', { rewardAccountDetails: {} }],
    [
      'no address names a reward account',
      { addresses: [addressEntry(ownAddress, undefined)] },
    ],
    ['the account has no addresses', { addresses: [] }],
    [
      'a pending transaction already withdraws these rewards',
      {
        pendingRewardWithdrawals: pendingOn(ownRewardAccount, CUSTOMER_REWARDS),
      },
    ],
    [
      'the stake credential is a script',
      {
        addresses: [
          addressEntry(
            scriptStakedAddress,
            rewardAccountOf(scriptStakedAddress),
          ),
        ],
      },
    ],
  ])('resolves nothing when %s', (_, options) => {
    expect(resolve(options)).toBeUndefined();
  });
});
