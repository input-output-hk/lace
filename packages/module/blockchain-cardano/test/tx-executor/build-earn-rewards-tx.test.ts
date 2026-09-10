import { Cardano, Serialization } from '@cardano-sdk/core';
import { AccountId } from '@lace-contract/wallet-repo';
import { firstValueFrom, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { makeBuildEarnRewardsTx } from '../../src/tx-executor-implementation';

import type { Address, AnyAddress } from '@lace-contract/addresses';
import type {
  AccountRewardAccountDetailsMap,
  DRepOption,
  RequiredProtocolParameters,
} from '@lace-contract/cardano-context';
import type { SideEffectDependencies } from '@lace-contract/module';

const testAccountId = AccountId('test-account');

// addr_test1qz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj83ws8lhrn648jjxtwq2ytjqp
const testAddress =
  'addr_test1qz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj83ws8lhrn648jjxtwq2ytjqp';

// Enterprise address (payment part only, no stake credential).
const enterpriseAddress =
  'addr_test1vpu5vlrf4xkxv2qpwngf6cjhtw542ayty80v8dyr49rf5eg57c2qv';

const testPoolId = Cardano.PoolId(
  'pool1pu5jlj4q9w9jlxeu370a3c9myx47md5j5m2str0naunn2q3lkdy',
);

const specificDRepId = Cardano.DRepID(
  'drep1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqua9udh',
);
const specificDRep: DRepOption = {
  type: 'specific',
  drepId: specificDRepId,
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

const rewardAccountDetails = (
  isRegistered: boolean,
): AccountRewardAccountDetailsMap =>
  ({
    [testAccountId]: {
      rewardAccountInfo: {
        isActive: isRegistered,
        isRegistered,
        rewardsSum: 0 as unknown as Parameters<typeof AccountId>[0],
        controlledAmount: 0 as unknown as Parameters<typeof AccountId>[0],
        withdrawableAmount: 0 as unknown as Parameters<typeof AccountId>[0],
      },
    },
  } as AccountRewardAccountDetailsMap);

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
    rewardAccountDetails: details = rewardAccountDetails(false),
  } = overrides;
  return {
    txExecutorCardano: {
      cardanoNetworkMagic$: of(networkMagic),
      cardanoProtocolParameters$: of(protocolParameters),
      cardanoAccountUtxos$: of({ [testAccountId]: utxos }),
      cardanoAccountUnspendableUtxos$: of({}),
      cardanoAddresses$: of(addresses),
      cardanoRewardAccountDetails$: of(details),
    },
  } as unknown as SideEffectDependencies;
};

const certificatesOf = (serializedTx: string): Cardano.Certificate[] =>
  Serialization.Transaction.fromCbor(
    Serialization.TxCBOR(serializedTx),
  ).toCore().body.certificates ?? [];

/** The stake credential the builder derives from the account's base address —
 * every certificate in the tx must target exactly this credential. */
const stakeCredentialOf = (address: string): Cardano.Credential => {
  const credential = Cardano.Address.fromString(address)
    ?.asBase()
    ?.getStakeCredential();
  if (!credential) throw new Error(`No stake credential in ${address}`);
  return credential;
};

describe('makeBuildEarnRewardsTx', () => {
  it('returns error when network magic is not available', async () => {
    const result = await firstValueFrom(
      makeBuildEarnRewardsTx(makeDependencies({ networkMagic: null }))({
        accountId: testAccountId,
        poolId: testPoolId,
        dRep: specificDRep,
      }),
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe('Network magic not available');
    }
  });

  it('returns error when protocol parameters are not available', async () => {
    const result = await firstValueFrom(
      makeBuildEarnRewardsTx(makeDependencies({ protocolParameters: null }))({
        accountId: testAccountId,
        poolId: testPoolId,
        dRep: specificDRep,
      }),
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe('Protocol parameters not available');
    }
  });

  it('returns error when no addresses found for account', async () => {
    const result = await firstValueFrom(
      makeBuildEarnRewardsTx(makeDependencies({ addresses: [] }))({
        accountId: testAccountId,
        poolId: testPoolId,
        dRep: specificDRep,
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
      makeBuildEarnRewardsTx(
        makeDependencies({
          rewardAccountDetails: {} as AccountRewardAccountDetailsMap,
        }),
      )({
        accountId: testAccountId,
        poolId: testPoolId,
        dRep: specificDRep,
      }),
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe(
        'Reward account details not available yet',
      );
    }
  });

  it('returns error when the address has no stake credential (enterprise address)', async () => {
    const result = await firstValueFrom(
      makeBuildEarnRewardsTx(
        makeDependencies({
          addresses: [
            { ...mockAddress, address: enterpriseAddress as Address },
          ],
        }),
      )({
        accountId: testAccountId,
        poolId: testPoolId,
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

  it('builds ONE tx with register+stake-delegation AND vote-delegation certs, charging the deposit, when unregistered', async () => {
    const result = await firstValueFrom(
      makeBuildEarnRewardsTx(makeDependencies())({
        accountId: testAccountId,
        poolId: testPoolId,
        dRep: specificDRep,
      }),
    );

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.deposit).toBe('2000000');
    expect(result.fees.length).toBeGreaterThan(0);

    // Exactly the three certs — registration, stake delegation, and vote
    // delegation — and their CONTENTS: the promoted pool, the account's stake
    // credential, the protocol deposit, and the promoted DRep. Granular certs,
    // never the StakeRegistrationDelegation combo: the Ledger and Trezor
    // certificate mappers reject the combo, and a migration destination can be
    // any hardware wallet.
    const certs = certificatesOf(result.serializedTx);
    expect(certs).toHaveLength(3);

    // ORDER matters: Conway applies certificates sequentially, so the stake key
    // must be registered before the delegations reference its credential.
    // Asserted positionally — a find() would pass even if the builder emitted
    // them the wrong way round, producing a tx the ledger rejects.
    expect(certs.map(cert => cert.__typename)).toEqual([
      Cardano.CertificateType.Registration,
      Cardano.CertificateType.StakeDelegation,
      Cardano.CertificateType.VoteDelegation,
    ]);

    const registrationCert = certs.find(
      (cert): cert is Cardano.NewStakeAddressCertificate =>
        cert.__typename === Cardano.CertificateType.Registration,
    );
    expect(registrationCert?.stakeCredential).toEqual(
      stakeCredentialOf(testAddress),
    );
    expect(registrationCert?.deposit).toBe(
      BigInt(mockProtocolParameters.stakeKeyDeposit),
    );

    const stakeCert = certs.find(
      (cert): cert is Cardano.StakeDelegationCertificate =>
        cert.__typename === Cardano.CertificateType.StakeDelegation,
    );
    expect(stakeCert?.poolId).toBe(testPoolId);
    expect(stakeCert?.stakeCredential).toEqual(stakeCredentialOf(testAddress));

    const voteCert = certs.find(
      (cert): cert is Cardano.VoteDelegationCertificate =>
        cert.__typename === Cardano.CertificateType.VoteDelegation,
    );
    expect(voteCert?.dRep).toEqual(Cardano.DRepID.toCredential(specificDRepId));
    expect(voteCert?.stakeCredential).toEqual(stakeCredentialOf(testAddress));
  });

  it('builds ONE tx with stake-delegation AND vote-delegation certs, no deposit, when already registered', async () => {
    const result = await firstValueFrom(
      makeBuildEarnRewardsTx(
        makeDependencies({ rewardAccountDetails: rewardAccountDetails(true) }),
      )({
        accountId: testAccountId,
        poolId: testPoolId,
        dRep: specificDRep,
      }),
    );

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.deposit).toBe('');

    const certs = certificatesOf(result.serializedTx);
    expect(certs).toHaveLength(2);

    // Plain delegation cert (no deposit field at all) targeting the promoted
    // pool with the account's stake credential.
    const stakeCert = certs.find(
      (cert): cert is Cardano.StakeDelegationCertificate =>
        cert.__typename === Cardano.CertificateType.StakeDelegation,
    );
    expect(stakeCert?.poolId).toBe(testPoolId);
    expect(stakeCert?.stakeCredential).toEqual(stakeCredentialOf(testAddress));

    const voteCert = certs.find(
      (cert): cert is Cardano.VoteDelegationCertificate =>
        cert.__typename === Cardano.CertificateType.VoteDelegation,
    );
    expect(voteCert?.dRep).toEqual(Cardano.DRepID.toCredential(specificDRepId));
    expect(voteCert?.stakeCredential).toEqual(stakeCredentialOf(testAddress));
  });

  it('builds a vote-ONLY tx that leaves an existing stake delegation untouched', async () => {
    const result = await firstValueFrom(
      makeBuildEarnRewardsTx(
        makeDependencies({ rewardAccountDetails: rewardAccountDetails(true) }),
      )({
        accountId: testAccountId,
        // No poolId: the account already stakes somewhere and must not be moved.
        dRep: specificDRep,
      }),
    );

    expect(result.success).toBe(true);
    if (!result.success) return;

    // No deposit — the stake key is already registered.
    expect(result.deposit).toBe('');

    // Exactly one certificate, and it is the vote delegation. Asserted as the
    // whole list so a stray stake-delegation cert (which would silently move the
    // user's pool) fails the test.
    const certs = certificatesOf(result.serializedTx);
    expect(certs.map(cert => cert.__typename)).toEqual([
      Cardano.CertificateType.VoteDelegation,
    ]);

    const voteCert = certs[0] as Cardano.VoteDelegationCertificate;
    expect(voteCert.dRep).toEqual(Cardano.DRepID.toCredential(specificDRepId));
    expect(voteCert.stakeCredential).toEqual(stakeCredentialOf(testAddress));
  });

  /**
   * Pool-only (LW-15293: an absent promoted DRep must not disable staking).
   * Registration + stake delegation, and NO vote certificate — emitting one
   * with no DRep configured is impossible, and fabricating a sentinel vote is
   * forbidden by the same spec decision that keeps sentinels out of the
   * resolver.
   */
  it('builds a stake-only tx, with no vote certificate, when no DRep is supplied', async () => {
    const result = await firstValueFrom(
      makeBuildEarnRewardsTx(
        makeDependencies({ rewardAccountDetails: rewardAccountDetails(false) }),
      )({
        accountId: testAccountId,
        poolId: testPoolId,
      }),
    );

    expect(result.success).toBe(true);
    if (!result.success) return;

    const certs = certificatesOf(result.serializedTx);
    expect(
      certs.some(
        cert => cert.__typename === Cardano.CertificateType.VoteDelegation,
      ),
    ).toBe(false);
    expect(
      certs.some(
        cert => cert.__typename === Cardano.CertificateType.StakeDelegation,
      ),
    ).toBe(true);
    // Unregistered account: the deposit is still charged for the registration.
    expect(BigInt(result.deposit)).toBeGreaterThan(0n);
  });

  // Neither leg supplied is a caller bug: nothing to delegate means no
  // certificate to emit, and a fee-only transaction must never be minted.
  it('refuses when neither a pool nor a DRep is supplied', async () => {
    const result = await firstValueFrom(
      makeBuildEarnRewardsTx(
        makeDependencies({ rewardAccountDetails: rewardAccountDetails(true) }),
      )({
        accountId: testAccountId,
      }),
    );

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.message).toMatch(/Nothing to delegate/);
  });

  it('refuses a vote-only tx when the stake key is not registered', async () => {
    const result = await firstValueFrom(
      makeBuildEarnRewardsTx(
        makeDependencies({ rewardAccountDetails: rewardAccountDetails(false) }),
      )({
        accountId: testAccountId,
        dRep: specificDRep,
      }),
    );

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.message).toBe(
      'Cannot delegate voting power for an unregistered stake key without a pool delegation',
    );
  });

  it('catches and returns errors from transaction building (empty UTxO set)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await firstValueFrom(
      makeBuildEarnRewardsTx(makeDependencies({ utxos: [] }))({
        accountId: testAccountId,
        poolId: testPoolId,
        dRep: specificDRep,
      }),
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeInstanceOf(Error);
    }

    vi.restoreAllMocks();
  });
});
