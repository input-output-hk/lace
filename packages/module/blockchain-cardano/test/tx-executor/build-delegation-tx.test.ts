import { Cardano } from '@cardano-sdk/core';
import { AccountId } from '@lace-contract/wallet-repo';
import { firstValueFrom, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { makeBuildDelegationTx } from '../../src/tx-executor-implementation';

import type { Address, AnyAddress } from '@lace-contract/addresses';
import type {
  AccountRewardAccountDetailsMap,
  RequiredProtocolParameters,
} from '@lace-contract/cardano-context';
import type { SideEffectDependencies } from '@lace-contract/module';

const testAccountId = AccountId('test-account');
const testPoolId = Cardano.PoolId(
  'pool1pu5jlj4q9w9jlxeu370a3c9myx47md5j5m2str0naunn2q3lkdy',
);

const testAddress =
  'addr_test1qz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj83ws8lhrn648jjxtwq2ytjqp';

const mockUtxo: Cardano.Utxo = [
  {
    address: Cardano.PaymentAddress(testAddress),
    txId: Cardano.TransactionId(
      '0000000000000000000000000000000000000000000000000000000000000001',
    ),
    index: 0,
  },
  {
    address: Cardano.PaymentAddress(testAddress),
    value: { coins: 10_000_000n },
  },
];

const mockProtocolParameters: RequiredProtocolParameters = {
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
  prices: {
    memory: 0.0577,
    steps: 0.0000721,
  },
};

const mockAddress: AnyAddress = {
  accountId: testAccountId,
  address: testAddress as Address,
  blockchainName: 'Cardano',
};

const defaultRewardAccountDetails = {
  [testAccountId]: {
    rewardAccountInfo: { isActive: false, isRegistered: false },
  },
} as AccountRewardAccountDetailsMap;

describe('makeBuildDelegationTx', () => {
  it('returns error when network magic is not available', async () => {
    const dependencies = {
      txExecutorCardano: {
        cardanoNetworkMagic$: of(null),
        cardanoProtocolParameters$: of(mockProtocolParameters),
        cardanoAccountUtxos$: of({ [testAccountId]: [mockUtxo] }),
        cardanoAccountUnspendableUtxos$: of({}),
        cardanoAddresses$: of([mockAddress]),
        cardanoRewardAccountDetails$: of(defaultRewardAccountDetails),
      },
    } as unknown as SideEffectDependencies;

    const buildDelegationTx = makeBuildDelegationTx(dependencies);

    const result = await firstValueFrom(
      buildDelegationTx({ accountId: testAccountId, poolId: testPoolId }),
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe('Network magic not available');
    }
  });

  it('returns error when protocol parameters are not available', async () => {
    const dependencies = {
      txExecutorCardano: {
        cardanoNetworkMagic$: of(764824073),
        cardanoProtocolParameters$: of(null),
        cardanoAccountUtxos$: of({ [testAccountId]: [mockUtxo] }),
        cardanoAccountUnspendableUtxos$: of({}),
        cardanoAddresses$: of([mockAddress]),
        cardanoRewardAccountDetails$: of(defaultRewardAccountDetails),
      },
    } as unknown as SideEffectDependencies;

    const buildDelegationTx = makeBuildDelegationTx(dependencies);

    const result = await firstValueFrom(
      buildDelegationTx({ accountId: testAccountId, poolId: testPoolId }),
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe('Protocol parameters not available');
    }
  });

  it('returns error when no addresses found for account', async () => {
    const dependencies = {
      txExecutorCardano: {
        cardanoNetworkMagic$: of(764824073),
        cardanoProtocolParameters$: of(mockProtocolParameters),
        cardanoAccountUtxos$: of({ [testAccountId]: [mockUtxo] }),
        cardanoAccountUnspendableUtxos$: of({}),
        cardanoAddresses$: of([]),
        cardanoRewardAccountDetails$: of(defaultRewardAccountDetails),
      },
    } as unknown as SideEffectDependencies;

    const buildDelegationTx = makeBuildDelegationTx(dependencies);

    const result = await firstValueFrom(
      buildDelegationTx({ accountId: testAccountId, poolId: testPoolId }),
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe(
        'No Cardano addresses found for account',
      );
    }
  });

  it('returns error when reward account details not available', async () => {
    const dependencies = {
      txExecutorCardano: {
        cardanoNetworkMagic$: of(764824073),
        cardanoProtocolParameters$: of(mockProtocolParameters),
        cardanoAccountUtxos$: of({ [testAccountId]: [mockUtxo] }),
        cardanoAccountUnspendableUtxos$: of({}),
        cardanoAddresses$: of([mockAddress]),
        cardanoRewardAccountDetails$: of({}),
      },
    } as unknown as SideEffectDependencies;

    const buildDelegationTx = makeBuildDelegationTx(dependencies);

    const result = await firstValueFrom(
      buildDelegationTx({ accountId: testAccountId, poolId: testPoolId }),
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe(
        'Reward account details not available yet',
      );
    }
  });

  it('builds transaction with registration+delegation for unregistered stake key', async () => {
    const dependencies = {
      txExecutorCardano: {
        cardanoNetworkMagic$: of(764824073),
        cardanoProtocolParameters$: of(mockProtocolParameters),
        cardanoAccountUtxos$: of({ [testAccountId]: [mockUtxo] }),
        cardanoAccountUnspendableUtxos$: of({}),
        cardanoAddresses$: of([mockAddress]),
        cardanoRewardAccountDetails$: of({
          [testAccountId]: {
            rewardAccountInfo: { isActive: false, isRegistered: false },
          },
        } as AccountRewardAccountDetailsMap),
      },
    } as unknown as SideEffectDependencies;

    const buildDelegationTx = makeBuildDelegationTx(dependencies);

    const result = await firstValueFrom(
      buildDelegationTx({ accountId: testAccountId, poolId: testPoolId }),
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.serializedTx).toBeTruthy();
      expect(result.fees.length).toBeGreaterThan(0);
      expect(result.deposit).toBe('2000000');
    }
  });

  it('builds transaction without deposit for already registered stake key', async () => {
    const dependencies = {
      txExecutorCardano: {
        cardanoNetworkMagic$: of(764824073),
        cardanoProtocolParameters$: of(mockProtocolParameters),
        cardanoAccountUtxos$: of({ [testAccountId]: [mockUtxo] }),
        cardanoAccountUnspendableUtxos$: of({}),
        cardanoAddresses$: of([mockAddress]),
        cardanoRewardAccountDetails$: of({
          [testAccountId]: {
            rewardAccountInfo: { isActive: true, isRegistered: true },
          },
        } as AccountRewardAccountDetailsMap),
      },
    } as unknown as SideEffectDependencies;

    const buildDelegationTx = makeBuildDelegationTx(dependencies);

    const result = await firstValueFrom(
      buildDelegationTx({ accountId: testAccountId, poolId: testPoolId }),
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.serializedTx).toBeTruthy();
      expect(result.fees.length).toBeGreaterThan(0);
      expect(result.deposit).toBe('');
    }
  });

  it('catches and returns errors from transaction building', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const dependencies = {
      txExecutorCardano: {
        cardanoNetworkMagic$: of(764824073),
        cardanoProtocolParameters$: of(mockProtocolParameters),
        cardanoAccountUtxos$: of({ [testAccountId]: [] }),
        cardanoAccountUnspendableUtxos$: of({}),
        cardanoAddresses$: of([mockAddress]),
        cardanoRewardAccountDetails$: of(defaultRewardAccountDetails),
      },
    } as unknown as SideEffectDependencies;

    const buildDelegationTx = makeBuildDelegationTx(dependencies);

    const result = await firstValueFrom(
      buildDelegationTx({ accountId: testAccountId, poolId: testPoolId }),
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeInstanceOf(Error);
    }

    vi.restoreAllMocks();
  });

  it('excludes unspendable UTXOs from transaction inputs', async () => {
    const collateralUtxo: Cardano.Utxo = [
      {
        address: Cardano.PaymentAddress(testAddress),
        txId: Cardano.TransactionId(
          '0000000000000000000000000000000000000000000000000000000000000099',
        ),
        index: 0,
      },
      {
        address: Cardano.PaymentAddress(testAddress),
        value: { coins: 5_000_000n },
      },
    ];

    const dependencies = {
      txExecutorCardano: {
        cardanoNetworkMagic$: of(764824073),
        cardanoProtocolParameters$: of(mockProtocolParameters),
        cardanoAccountUtxos$: of({
          [testAccountId]: [mockUtxo, collateralUtxo],
        }),
        cardanoAccountUnspendableUtxos$: of({
          [testAccountId]: [collateralUtxo],
        }),
        cardanoAddresses$: of([mockAddress]),
        cardanoRewardAccountDetails$: of(defaultRewardAccountDetails),
      },
    } as unknown as SideEffectDependencies;

    const buildDelegationTx = makeBuildDelegationTx(dependencies);

    const result = await firstValueFrom(
      buildDelegationTx({ accountId: testAccountId, poolId: testPoolId }),
    );

    expect(result.success).toBe(true);
  });
});
