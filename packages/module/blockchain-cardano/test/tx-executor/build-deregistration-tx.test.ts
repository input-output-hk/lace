import { Cardano, Serialization } from '@cardano-sdk/core';
import { AccountId } from '@lace-contract/wallet-repo';
import { BigNumber } from '@lace-sdk/util';
import { firstValueFrom, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { makeBuildDeregistrationTx } from '../../src/tx-executor-implementation';

import type { Address, AnyAddress } from '@lace-contract/addresses';
import type { AccountRewardAccountDetailsMap } from '@lace-contract/cardano-context';
import type { SideEffectDependencies } from '@lace-contract/module';

const testAccountId = AccountId('test-account');

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

const mockProtocolParameters: Cardano.ProtocolParameters = {
  coinsPerUtxoByte: 4310,
  maxCollateralInputs: 3,
  maxTxSize: 16384,
  maxValueSize: 5000,
  minFeeCoefficient: 44,
  minFeeConstant: 155381,
  minPoolCost: 170_000_000,
  poolDeposit: 500_000_000,
  stakeKeyDeposit: 2_000_000,
  prices: {
    memory: 0.0577,
    steps: 0.0000721,
  },
} as Cardano.ProtocolParameters;

const mockAddress: AnyAddress = {
  accountId: testAccountId,
  address: testAddress as Address,
  blockchainName: 'Cardano',
};

// For deregistration, the stake key must be registered (isActive: true)
const activeRewardAccountDetails = {
  [testAccountId]: {
    rewardAccountInfo: { isActive: true, isRegistered: true },
  },
} as AccountRewardAccountDetailsMap;

const inactiveRewardAccountDetails = {
  [testAccountId]: {
    rewardAccountInfo: { isActive: false, isRegistered: false },
  },
} as AccountRewardAccountDetailsMap;

const activeRewardAccountDetailsWithRewards = {
  [testAccountId]: {
    rewardAccountInfo: {
      isActive: true,
      isRegistered: true,
      withdrawableAmount: BigNumber(5000000n), // 5 ADA
    },
  },
} as AccountRewardAccountDetailsMap;

describe('makeBuildDeregistrationTx', () => {
  it('returns error when network magic is not available', async () => {
    const dependencies = {
      txExecutorCardano: {
        cardanoNetworkMagic$: of(null),
        cardanoProtocolParameters$: of(mockProtocolParameters),
        cardanoAccountUtxos$: of({ [testAccountId]: [mockUtxo] }),
        cardanoAccountUnspendableUtxos$: of({}),
        cardanoAddresses$: of([mockAddress]),
        cardanoRewardAccountDetails$: of(activeRewardAccountDetails),
      },
    } as unknown as SideEffectDependencies;

    const buildDeregistrationTx = makeBuildDeregistrationTx(dependencies);

    const result = await firstValueFrom(
      buildDeregistrationTx({ accountId: testAccountId }),
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
        cardanoRewardAccountDetails$: of(activeRewardAccountDetails),
      },
    } as unknown as SideEffectDependencies;

    const buildDeregistrationTx = makeBuildDeregistrationTx(dependencies);

    const result = await firstValueFrom(
      buildDeregistrationTx({ accountId: testAccountId }),
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
        cardanoRewardAccountDetails$: of(activeRewardAccountDetails),
      },
    } as unknown as SideEffectDependencies;

    const buildDeregistrationTx = makeBuildDeregistrationTx(dependencies);

    const result = await firstValueFrom(
      buildDeregistrationTx({ accountId: testAccountId }),
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

    const buildDeregistrationTx = makeBuildDeregistrationTx(dependencies);

    const result = await firstValueFrom(
      buildDeregistrationTx({ accountId: testAccountId }),
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe(
        'Stake key is not registered or reward account details not available',
      );
    }
  });

  it('returns error when stake key is not registered', async () => {
    const dependencies = {
      txExecutorCardano: {
        cardanoNetworkMagic$: of(764824073),
        cardanoProtocolParameters$: of(mockProtocolParameters),
        cardanoAccountUtxos$: of({ [testAccountId]: [mockUtxo] }),
        cardanoAccountUnspendableUtxos$: of({}),
        cardanoAddresses$: of([mockAddress]),
        cardanoRewardAccountDetails$: of(inactiveRewardAccountDetails),
      },
    } as unknown as SideEffectDependencies;

    const buildDeregistrationTx = makeBuildDeregistrationTx(dependencies);

    const result = await firstValueFrom(
      buildDeregistrationTx({ accountId: testAccountId }),
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe(
        'Stake key is not registered or reward account details not available',
      );
    }
  });

  it('builds transaction with deposit return for registered stake key', async () => {
    const dependencies = {
      txExecutorCardano: {
        cardanoNetworkMagic$: of(764824073),
        cardanoProtocolParameters$: of(mockProtocolParameters),
        cardanoAccountUtxos$: of({ [testAccountId]: [mockUtxo] }),
        cardanoAccountUnspendableUtxos$: of({}),
        cardanoAddresses$: of([mockAddress]),
        cardanoRewardAccountDetails$: of(activeRewardAccountDetails),
      },
    } as unknown as SideEffectDependencies;

    const buildDeregistrationTx = makeBuildDeregistrationTx(dependencies);

    const result = await firstValueFrom(
      buildDeregistrationTx({ accountId: testAccountId }),
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.serializedTx).toBeTruthy();
      expect(result.fees.length).toBeGreaterThan(0);
      // depositReturn should be the stake key deposit (positive value - user gets this back)
      expect(result.depositReturn).toBe('2000000');
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
        cardanoRewardAccountDetails$: of(activeRewardAccountDetails),
      },
    } as unknown as SideEffectDependencies;

    const buildDeregistrationTx = makeBuildDeregistrationTx(dependencies);

    const result = await firstValueFrom(
      buildDeregistrationTx({ accountId: testAccountId }),
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeInstanceOf(Error);
    }

    vi.restoreAllMocks();
  });

  it('builds transaction with withdrawal when rewards exist', async () => {
    const dependencies = {
      txExecutorCardano: {
        cardanoNetworkMagic$: of(764824073),
        cardanoProtocolParameters$: of(mockProtocolParameters),
        cardanoAccountUtxos$: of({ [testAccountId]: [mockUtxo] }),
        cardanoAccountUnspendableUtxos$: of({}),
        cardanoAddresses$: of([mockAddress]),
        cardanoRewardAccountDetails$: of(activeRewardAccountDetailsWithRewards),
      },
    } as unknown as SideEffectDependencies;

    const buildDeregistrationTx = makeBuildDeregistrationTx(dependencies);
    const result = await firstValueFrom(
      buildDeregistrationTx({ accountId: testAccountId }),
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.depositReturn).toBe('2000000');
      // Verify TX includes withdrawal by decoding and checking body
      const tx = Serialization.Transaction.fromCbor(
        Serialization.TxCBOR(result.serializedTx),
      );
      expect(tx.toCore().body.withdrawals?.length).toBe(1);
      expect(tx.toCore().body.withdrawals?.[0]?.quantity).toBe(5_000_000n);
    }
  });

  it('builds transaction without withdrawal when no rewards exist', async () => {
    const dependencies = {
      txExecutorCardano: {
        cardanoNetworkMagic$: of(764824073),
        cardanoProtocolParameters$: of(mockProtocolParameters),
        cardanoAccountUtxos$: of({ [testAccountId]: [mockUtxo] }),
        cardanoAccountUnspendableUtxos$: of({}),
        cardanoAddresses$: of([mockAddress]),
        cardanoRewardAccountDetails$: of(activeRewardAccountDetails),
      },
    } as unknown as SideEffectDependencies;

    const buildDeregistrationTx = makeBuildDeregistrationTx(dependencies);
    const result = await firstValueFrom(
      buildDeregistrationTx({ accountId: testAccountId }),
    );

    expect(result.success).toBe(true);
    if (result.success) {
      // Verify TX does not include withdrawal
      const tx = Serialization.Transaction.fromCbor(
        Serialization.TxCBOR(result.serializedTx),
      );
      expect(tx.toCore().body.withdrawals).toBeUndefined();
    }
  });
});
