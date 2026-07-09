import { Cardano } from '@cardano-sdk/core';
import { Hash28ByteBase16 } from '@cardano-sdk/crypto';
import { describe, expect, it } from 'vitest';

import { getPoolIdFromCertificate } from '../../src/utils/certificates';

const stakeCredential: Cardano.Credential = {
  hash: Hash28ByteBase16(
    '1c46955f71c49a6c987104145d5a18154883f51c846c12a6a02dcd60',
  ),
  type: Cardano.CredentialType.KeyHash,
};
const dRepCredential: Cardano.Credential = {
  hash: Hash28ByteBase16(
    'aa46955f71c49a6c987104145d5a18154883f51c846c12a6a02dcd60',
  ),
  type: Cardano.CredentialType.KeyHash,
};
const POOL_ID = Cardano.PoolId(
  'pool18q5sayzqekqvqyenlkgaarlza5jxzhkyq9akc9qr5ytgczkjh23',
);
// A second branded value used only to disambiguate from POOL_ID in the
// PoolRegistration test. Using `as unknown as` because we don't need a
// valid bech32 checksum here — the helper only reads the field through.
const POOL_PARAMS_ID = 'pool-params-id-sentinel' as unknown as Cardano.PoolId;
const DEPOSIT = 2_000_000n;

describe('getPoolIdFromCertificate', () => {
  describe('certificates that carry a poolId', () => {
    it('returns the poolId for StakeDelegation', () => {
      const certificate: Cardano.HydratedCertificate = {
        __typename: Cardano.CertificateType.StakeDelegation,
        stakeCredential,
        poolId: POOL_ID,
      };
      expect(getPoolIdFromCertificate(certificate)).toBe(POOL_ID);
    });

    it('returns the poolId for StakeRegistrationDelegation', () => {
      const certificate: Cardano.HydratedCertificate = {
        __typename: Cardano.CertificateType.StakeRegistrationDelegation,
        stakeCredential,
        poolId: POOL_ID,
        deposit: DEPOSIT,
      };
      expect(getPoolIdFromCertificate(certificate)).toBe(POOL_ID);
    });

    it('returns the poolId for StakeVoteDelegation', () => {
      const certificate: Cardano.HydratedCertificate = {
        __typename: Cardano.CertificateType.StakeVoteDelegation,
        stakeCredential,
        poolId: POOL_ID,
        dRep: dRepCredential,
      };
      expect(getPoolIdFromCertificate(certificate)).toBe(POOL_ID);
    });

    it('returns the poolId for StakeVoteRegistrationDelegation', () => {
      const certificate: Cardano.HydratedCertificate = {
        __typename: Cardano.CertificateType.StakeVoteRegistrationDelegation,
        stakeCredential,
        poolId: POOL_ID,
        dRep: dRepCredential,
        deposit: DEPOSIT,
      };
      expect(getPoolIdFromCertificate(certificate)).toBe(POOL_ID);
    });

    it('returns the poolId for PoolRetirement', () => {
      const certificate: Cardano.HydratedCertificate = {
        __typename: Cardano.CertificateType.PoolRetirement,
        poolId: POOL_ID,
        epoch: 236 as Cardano.EpochNo,
      };
      expect(getPoolIdFromCertificate(certificate)).toBe(POOL_ID);
    });
  });

  describe('PoolRegistration', () => {
    it('returns the id from poolParameters (not from a top-level poolId field)', () => {
      // PoolRegistration nests the id under poolParameters; only the bare
      // minimum fields the helper reads are populated.
      const certificate = {
        __typename: Cardano.CertificateType.PoolRegistration,
        poolParameters: { id: POOL_PARAMS_ID },
      } as unknown as Cardano.HydratedCertificate;
      expect(getPoolIdFromCertificate(certificate)).toBe(POOL_PARAMS_ID);
    });
  });

  describe('certificates that do not carry a poolId', () => {
    const noPoolIdCases: Array<{
      name: string;
      certificate: Cardano.HydratedCertificate;
    }> = [
      {
        name: 'StakeRegistration',
        certificate: {
          __typename: Cardano.CertificateType.StakeRegistration,
          stakeCredential,
        },
      },
      {
        name: 'StakeDeregistration',
        certificate: {
          __typename: Cardano.CertificateType.StakeDeregistration,
          stakeCredential,
        },
      },
      {
        name: 'Registration',
        certificate: {
          __typename: Cardano.CertificateType.Registration,
          stakeCredential,
          deposit: DEPOSIT,
        },
      },
      {
        name: 'Unregistration',
        certificate: {
          __typename: Cardano.CertificateType.Unregistration,
          stakeCredential,
          deposit: DEPOSIT,
        },
      },
      {
        name: 'VoteDelegation',
        certificate: {
          __typename: Cardano.CertificateType.VoteDelegation,
          stakeCredential,
          dRep: dRepCredential,
        },
      },
      {
        name: 'VoteRegistrationDelegation',
        certificate: {
          __typename: Cardano.CertificateType.VoteRegistrationDelegation,
          stakeCredential,
          dRep: dRepCredential,
          deposit: DEPOSIT,
        },
      },
      {
        name: 'AuthorizeCommitteeHot',
        certificate: {
          __typename: Cardano.CertificateType.AuthorizeCommitteeHot,
          coldCredential: {
            hash: stakeCredential.hash,
            type: Cardano.CredentialType.KeyHash,
          },
          hotCredential: {
            hash: dRepCredential.hash,
            type: Cardano.CredentialType.KeyHash,
          },
        },
      },
      {
        name: 'ResignCommitteeCold',
        certificate: {
          __typename: Cardano.CertificateType.ResignCommitteeCold,
          coldCredential: {
            hash: stakeCredential.hash,
            type: Cardano.CredentialType.KeyHash,
          },
          anchor: null,
        },
      },
      {
        name: 'RegisterDelegateRepresentative',
        certificate: {
          __typename: Cardano.CertificateType.RegisterDelegateRepresentative,
          dRepCredential,
          deposit: DEPOSIT,
          anchor: null,
        },
      },
      {
        name: 'UnregisterDelegateRepresentative',
        certificate: {
          __typename: Cardano.CertificateType.UnregisterDelegateRepresentative,
          dRepCredential,
          deposit: DEPOSIT,
        },
      },
      {
        name: 'UpdateDelegateRepresentative',
        certificate: {
          __typename: Cardano.CertificateType.UpdateDelegateRepresentative,
          dRepCredential,
          anchor: null,
        },
      },
      {
        name: 'MIR',
        certificate: {
          __typename: Cardano.CertificateType.MIR,
        } as unknown as Cardano.HydratedCertificate,
      },
      {
        name: 'GenesisKeyDelegation',
        certificate: {
          __typename: Cardano.CertificateType.GenesisKeyDelegation,
        } as unknown as Cardano.HydratedCertificate,
      },
    ];

    it.each(noPoolIdCases)('returns undefined for $name', ({ certificate }) => {
      expect(getPoolIdFromCertificate(certificate)).toBeUndefined();
    });
  });
});
