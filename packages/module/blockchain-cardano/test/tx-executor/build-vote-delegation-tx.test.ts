import { Cardano } from '@cardano-sdk/core';
import { AccountId } from '@lace-contract/wallet-repo';
import { firstValueFrom, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { makeBuildVoteDelegationTx } from '../../src/tx-executor-implementation';

import type { Address, AnyAddress } from '@lace-contract/addresses';
import type {
  AccountRewardAccountDetailsMap,
  DRepOption,
  RequiredProtocolParameters,
} from '@lace-contract/cardano-context';
import type { SideEffectDependencies } from '@lace-contract/module';

const testAccountId = AccountId('test-account');

// addr_test1qz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj83ws8lhrn648jjxtwq2ytjqp
// Contains stake part: stake_test1up7pvfq8zn4quy45r2g572290p9vf99mr9tn7r9xrgy2l2qdsf58d
const testAddress =
  'addr_test1qz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj83ws8lhrn648jjxtwq2ytjqp';

// Enterprise address (payment part only, no stake credential): asBase() is
// null, so getStakeCredentialFromAddress returns undefined.
const enterpriseAddress =
  'addr_test1vpu5vlrf4xkxv2qpwngf6cjhtw542ayty80v8dyr49rf5eg57c2qv';

// Valid bech32 DRep id (all-zero credential) accepted by DRepID.toCredential —
// exercises the `specific` delegate branch (delegating to an actual DRep).
const specificDRep: DRepOption = {
  type: 'specific',
  drepId: Cardano.DRepID(
    'drep1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqua9udh',
  ),
};

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
  dRepDeposit: 500_000_000,
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

const unregisteredRewardAccountDetails: AccountRewardAccountDetailsMap = {
  [testAccountId]: {
    rewardAccountInfo: {
      isActive: false,
      isRegistered: false,
      rewardsSum: 0 as unknown as Parameters<typeof AccountId>[0],
      controlledAmount: 0 as unknown as Parameters<typeof AccountId>[0],
      withdrawableAmount: 0 as unknown as Parameters<typeof AccountId>[0],
    },
  },
} as AccountRewardAccountDetailsMap;

const registeredRewardAccountDetails: AccountRewardAccountDetailsMap = {
  [testAccountId]: {
    rewardAccountInfo: {
      isActive: true,
      isRegistered: true,
      rewardsSum: 0 as unknown as Parameters<typeof AccountId>[0],
      controlledAmount: 0 as unknown as Parameters<typeof AccountId>[0],
      withdrawableAmount: 0 as unknown as Parameters<typeof AccountId>[0],
    },
  },
} as AccountRewardAccountDetailsMap;

const makeDependencies = (
  overrides: Partial<{
    networkMagic: Cardano.NetworkMagic | null;
    protocolParameters: RequiredProtocolParameters | null;
    utxos: Cardano.Utxo[];
    addresses: AnyAddress[];
    rewardAccountDetails: AccountRewardAccountDetailsMap;
  }> = {},
): SideEffectDependencies => {
  const {
    networkMagic = 764824073 as Cardano.NetworkMagic,
    protocolParameters = mockProtocolParameters,
    utxos = [mockUtxo],
    addresses = [mockAddress],
    rewardAccountDetails = unregisteredRewardAccountDetails,
  } = overrides;
  return {
    txExecutorCardano: {
      cardanoNetworkMagic$: of(networkMagic),
      cardanoProtocolParameters$: of(protocolParameters),
      cardanoAccountUtxos$: of({ [testAccountId]: utxos }),
      cardanoAccountUnspendableUtxos$: of({}),
      cardanoAddresses$: of(addresses),
      cardanoRewardAccountDetails$: of(rewardAccountDetails),
    },
  } as unknown as SideEffectDependencies;
};

describe('makeBuildVoteDelegationTx', () => {
  it('returns error when network magic is not available', async () => {
    const result = await firstValueFrom(
      makeBuildVoteDelegationTx(makeDependencies({ networkMagic: null }))({
        accountId: testAccountId,
        dRep: { type: 'alwaysAbstain' },
      }),
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe('Network magic not available');
    }
  });

  it('returns error when protocol parameters are not available', async () => {
    const result = await firstValueFrom(
      makeBuildVoteDelegationTx(makeDependencies({ protocolParameters: null }))(
        {
          accountId: testAccountId,
          dRep: { type: 'alwaysAbstain' },
        },
      ),
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe('Protocol parameters not available');
    }
  });

  it('returns error when no addresses found for account', async () => {
    const result = await firstValueFrom(
      makeBuildVoteDelegationTx(makeDependencies({ addresses: [] }))({
        accountId: testAccountId,
        dRep: { type: 'alwaysAbstain' },
      }),
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe(
        'No Cardano addresses found for account',
      );
    }
  });

  it('returns error when reward account details not available', async () => {
    const result = await firstValueFrom(
      makeBuildVoteDelegationTx(
        makeDependencies({
          rewardAccountDetails: {} as AccountRewardAccountDetailsMap,
        }),
      )({
        accountId: testAccountId,
        dRep: { type: 'alwaysAbstain' },
      }),
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe(
        'Reward account details not available yet',
      );
    }
  });

  it('builds VoteRegistrationDelegation tx with deposit for unregistered stake key — alwaysAbstain', async () => {
    const dRep: DRepOption = { type: 'alwaysAbstain' };
    const result = await firstValueFrom(
      makeBuildVoteDelegationTx(makeDependencies())({
        accountId: testAccountId,
        dRep,
      }),
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.serializedTx).toBeTruthy();
      expect(result.fees.length).toBeGreaterThan(0);
      expect(result.deposit).toBe('2000000');
    }
  });

  it('builds VoteRegistrationDelegation tx with deposit for unregistered stake key — alwaysNoConfidence', async () => {
    const dRep: DRepOption = { type: 'alwaysNoConfidence' };
    const result = await firstValueFrom(
      makeBuildVoteDelegationTx(makeDependencies())({
        accountId: testAccountId,
        dRep,
      }),
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.deposit).toBe('2000000');
    }
  });

  it('builds VoteDelegation tx without deposit for already-registered stake key — alwaysAbstain', async () => {
    const result = await firstValueFrom(
      makeBuildVoteDelegationTx(
        makeDependencies({
          rewardAccountDetails: registeredRewardAccountDetails,
        }),
      )({
        accountId: testAccountId,
        dRep: { type: 'alwaysAbstain' },
      }),
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.serializedTx).toBeTruthy();
      expect(result.deposit).toBe('');
    }
  });

  it('builds VoteDelegation tx without deposit for already-registered stake key — alwaysNoConfidence', async () => {
    const result = await firstValueFrom(
      makeBuildVoteDelegationTx(
        makeDependencies({
          rewardAccountDetails: registeredRewardAccountDetails,
        }),
      )({
        accountId: testAccountId,
        dRep: { type: 'alwaysNoConfidence' },
      }),
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.deposit).toBe('');
    }
  });

  it('builds VoteRegistrationDelegation tx for a specific DRep (toCredential) when unregistered', async () => {
    const result = await firstValueFrom(
      makeBuildVoteDelegationTx(makeDependencies())({
        accountId: testAccountId,
        dRep: specificDRep,
      }),
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.serializedTx).toBeTruthy();
      expect(result.fees.length).toBeGreaterThan(0);
      expect(result.deposit).toBe('2000000');
    }
  });

  it('builds VoteDelegation tx for a specific DRep (toCredential) when already registered', async () => {
    const result = await firstValueFrom(
      makeBuildVoteDelegationTx(
        makeDependencies({
          rewardAccountDetails: registeredRewardAccountDetails,
        }),
      )({
        accountId: testAccountId,
        dRep: specificDRep,
      }),
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.serializedTx).toBeTruthy();
      expect(result.deposit).toBe('');
    }
  });

  it('returns error when the address has no stake credential (enterprise address)', async () => {
    const result = await firstValueFrom(
      makeBuildVoteDelegationTx(
        makeDependencies({
          addresses: [
            { ...mockAddress, address: enterpriseAddress as Address },
          ],
        }),
      )({
        accountId: testAccountId,
        dRep: specificDRep,
      }),
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe(
        'Could not extract stake credential from address',
      );
    }
  });

  it('catches and returns errors from transaction building (empty UTxO set)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await firstValueFrom(
      makeBuildVoteDelegationTx(makeDependencies({ utxos: [] }))({
        accountId: testAccountId,
        dRep: { type: 'alwaysAbstain' },
      }),
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeInstanceOf(Error);
    }

    vi.restoreAllMocks();
  });

  it('excludes unspendable UTxOs from transaction inputs', async () => {
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
        cardanoNetworkMagic$: of(764824073 as Cardano.NetworkMagic),
        cardanoProtocolParameters$: of(mockProtocolParameters),
        cardanoAccountUtxos$: of({
          [testAccountId]: [mockUtxo, collateralUtxo],
        }),
        cardanoAccountUnspendableUtxos$: of({
          [testAccountId]: [collateralUtxo],
        }),
        cardanoAddresses$: of([mockAddress]),
        cardanoRewardAccountDetails$: of(unregisteredRewardAccountDetails),
      },
    } as unknown as SideEffectDependencies;

    const result = await firstValueFrom(
      makeBuildVoteDelegationTx(dependencies)({
        accountId: testAccountId,
        dRep: { type: 'alwaysAbstain' },
      }),
    );

    expect(result.success).toBe(true);
  });
});
