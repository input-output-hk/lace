import { Cardano } from '@cardano-sdk/core';
import { Hash28ByteBase16, Hash32ByteBase16 } from '@cardano-sdk/crypto';
import { describe, expect, it } from 'vitest';

import {
  buildCertificateItems,
  buildDRepItem,
  getCertificateTypeLabel,
} from '../../../src/components/ActivityDetails/build-certificate-items';

import type {
  BuildCertificateItemsContext,
  CertificateRendering,
} from '../../../src/components/ActivityDetails/build-certificate-items';
import type { TFunction, TranslationKey } from '@lace-contract/i18n';

/**
 * Translation function used in tests: returns the translation key verbatim.
 * Lets us assert against the i18n keys directly without depending on
 * the actual translation strings.
 */
const t = ((key: TranslationKey) => key) as TFunction;

const POOL_DESCRIPTION = 'pool-description-rendered-by-component';
const COIN_SYMBOL = 'tADA';

const baseContext: BuildCertificateItemsContext = {
  t,
  coinSymbol: COIN_SYMBOL,
  poolDescription: POOL_DESCRIPTION,
};

const STAKE_CREDENTIAL_HASH = Hash28ByteBase16(
  '1c46955f71c49a6c987104145d5a18154883f51c846c12a6a02dcd60',
);
const stakeCredential: Cardano.Credential = {
  hash: STAKE_CREDENTIAL_HASH,
  type: Cardano.CredentialType.KeyHash,
};

const DREP_CREDENTIAL_HASH = Hash28ByteBase16(
  'aa46955f71c49a6c987104145d5a18154883f51c846c12a6a02dcd60',
);
const dRepCredential: Cardano.Credential = {
  hash: DREP_CREDENTIAL_HASH,
  type: Cardano.CredentialType.KeyHash,
};
/** Pre-computed bech32 form so tests don't depend on the bech32 encoder. */
const DREP_ID_BECH32 = Cardano.DRepID.cip105FromCredential(dRepCredential);

const COLD_CREDENTIAL_HASH = Hash28ByteBase16(
  'cccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
);
const HOT_CREDENTIAL_HASH = Hash28ByteBase16(
  'dddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
);

const POOL_ID = Cardano.PoolId(
  'pool18q5sayzqekqvqyenlkgaarlza5jxzhkyq9akc9qr5ytgczkjh23',
);

const DEPOSIT = 2_000_000n;
const FORMATTED_DEPOSIT = `2.00 ${COIN_SYMBOL}`;

const anchor: Cardano.Anchor = {
  url: 'https://example.com/anchor.jsonld',
  dataHash: Hash32ByteBase16(
    '3ea46c07aa3972b4c8fdd6b01472a0f0241d0a80db51100a05e7aa4d705cee39',
  ),
};

/** Convenience for the always-present "type" row. */
const typeItem = (typeKey: TranslationKey) => ({
  label: 'v2.activity-details.sheet.type',
  value: typeKey,
});

const stakeKeyItem = {
  label: 'v2.activity-details.sheet.stakeKey',
  value: STAKE_CREDENTIAL_HASH,
};
const poolIdItem = {
  label: 'v2.activity-details.sheet.poolId',
  value: POOL_DESCRIPTION,
};
const depositItem = {
  label: 'v2.activity-details.sheet.deposit',
  value: FORMATTED_DEPOSIT,
};
const drepFromCredentialItem = {
  label: 'v2.activity-details.sheet.drepId',
  value: DREP_ID_BECH32,
};
const anchorRows = [
  { label: 'v2.activity-details.sheet.anchor', value: anchor.url },
  { label: 'v2.activity-details.sheet.urlHash', value: anchor.dataHash },
];

const expectItems = (
  result: CertificateRendering,
): Extract<CertificateRendering, { kind: 'items' }> => {
  if (result.kind !== 'items') {
    throw new Error(
      `Expected items rendering but got: ${JSON.stringify(result)}`,
    );
  }
  return result;
};

describe('buildCertificateItems', () => {
  describe('getCertificateTypeLabel', () => {
    it('maps each certificate type to its translation key', () => {
      expect(
        getCertificateTypeLabel(t, Cardano.CertificateType.StakeRegistration),
      ).toBe('v2.activity-details.sheet.stakeRegistration');
      expect(
        getCertificateTypeLabel(t, Cardano.CertificateType.StakeDelegation),
      ).toBe('v2.activity-details.sheet.stakeDelegation');
      expect(
        getCertificateTypeLabel(t, Cardano.CertificateType.PoolRegistration),
      ).toBe('v2.activity-details.sheet.poolRegistration');
      expect(getCertificateTypeLabel(t, Cardano.CertificateType.MIR)).toBe(
        'v2.activity-details.sheet.mir',
      );
    });
  });

  describe('buildDRepItem', () => {
    it('returns the alwaysAbstain label for the always-abstain DRep', () => {
      const dRep: Cardano.DelegateRepresentative = {
        __typename: 'AlwaysAbstain',
      };
      expect(buildDRepItem(dRep, t)).toEqual({
        label: 'v2.activity-details.sheet.drepId',
        value: 'v2.activity-details.sheet.alwaysAbstain',
      });
    });

    it('returns the alwaysNoConfidence label for the always-no-confidence DRep', () => {
      const dRep: Cardano.DelegateRepresentative = {
        __typename: 'AlwaysNoConfidence',
      };
      expect(buildDRepItem(dRep, t)).toEqual({
        label: 'v2.activity-details.sheet.drepId',
        value: 'v2.activity-details.sheet.alwaysNoConfidence',
      });
    });

    it('returns the bech32-encoded credential for a credential DRep', () => {
      expect(buildDRepItem(dRepCredential, t)).toEqual({
        label: 'v2.activity-details.sheet.drepId',
        value: DREP_ID_BECH32,
      });
    });
  });

  describe('certificate types', () => {
    describe('StakeDelegation', () => {
      const certificate: Cardano.HydratedCertificate = {
        __typename: Cardano.CertificateType.StakeDelegation,
        stakeCredential,
        poolId: POOL_ID,
      };

      it('renders type, poolId, stakeKey in order', () => {
        const result = expectItems(
          buildCertificateItems(certificate, baseContext),
        );
        expect(result.items).toEqual([
          typeItem('v2.activity-details.sheet.stakeDelegation'),
          poolIdItem,
          stakeKeyItem,
        ]);
      });
    });

    describe('Registration', () => {
      const certificate: Cardano.HydratedCertificate = {
        __typename: Cardano.CertificateType.Registration,
        stakeCredential,
        deposit: DEPOSIT,
      };

      it('renders type, stakeKey, deposit in order', () => {
        const result = expectItems(
          buildCertificateItems(certificate, baseContext),
        );
        expect(result.items).toEqual([
          typeItem('v2.activity-details.sheet.registration'),
          stakeKeyItem,
          depositItem,
        ]);
      });
    });

    describe('Unregistration', () => {
      const certificate: Cardano.HydratedCertificate = {
        __typename: Cardano.CertificateType.Unregistration,
        stakeCredential,
        deposit: DEPOSIT,
      };

      it('renders type, stakeKey, deposit in order', () => {
        const result = expectItems(
          buildCertificateItems(certificate, baseContext),
        );
        expect(result.items).toEqual([
          typeItem('v2.activity-details.sheet.unregistration'),
          stakeKeyItem,
          depositItem,
        ]);
      });
    });

    describe('VoteDelegation', () => {
      const certificate: Cardano.HydratedCertificate = {
        __typename: Cardano.CertificateType.VoteDelegation,
        stakeCredential,
        dRep: dRepCredential,
      };

      it('renders type, stakeKey, drepId in order', () => {
        const result = expectItems(
          buildCertificateItems(certificate, baseContext),
        );
        expect(result.items).toEqual([
          typeItem('v2.activity-details.sheet.voteDelegation'),
          stakeKeyItem,
          drepFromCredentialItem,
        ]);
      });

      it('uses the alwaysAbstain DRep label when the dRep is AlwaysAbstain', () => {
        const result = expectItems(
          buildCertificateItems(
            { ...certificate, dRep: { __typename: 'AlwaysAbstain' } },
            baseContext,
          ),
        );
        expect(result.items[2]).toEqual({
          label: 'v2.activity-details.sheet.drepId',
          value: 'v2.activity-details.sheet.alwaysAbstain',
        });
      });

      it('uses the alwaysNoConfidence DRep label when the dRep is AlwaysNoConfidence', () => {
        const result = expectItems(
          buildCertificateItems(
            { ...certificate, dRep: { __typename: 'AlwaysNoConfidence' } },
            baseContext,
          ),
        );
        expect(result.items[2]).toEqual({
          label: 'v2.activity-details.sheet.drepId',
          value: 'v2.activity-details.sheet.alwaysNoConfidence',
        });
      });
    });

    describe('StakeVoteDelegation', () => {
      const certificate: Cardano.HydratedCertificate = {
        __typename: Cardano.CertificateType.StakeVoteDelegation,
        stakeCredential,
        poolId: POOL_ID,
        dRep: dRepCredential,
      };

      it('renders type, stakeKey, poolId, drepId in order', () => {
        const result = expectItems(
          buildCertificateItems(certificate, baseContext),
        );
        expect(result.items).toEqual([
          typeItem('v2.activity-details.sheet.stakeVoteDelegation'),
          stakeKeyItem,
          poolIdItem,
          drepFromCredentialItem,
        ]);
      });
    });

    describe('StakeRegistrationDelegation', () => {
      const certificate: Cardano.HydratedCertificate = {
        __typename: Cardano.CertificateType.StakeRegistrationDelegation,
        stakeCredential,
        poolId: POOL_ID,
        deposit: DEPOSIT,
      };

      it('renders type, stakeKey, poolId, deposit in order', () => {
        const result = expectItems(
          buildCertificateItems(certificate, baseContext),
        );
        expect(result.items).toEqual([
          typeItem('v2.activity-details.sheet.stakeRegistrationDelegation'),
          stakeKeyItem,
          poolIdItem,
          depositItem,
        ]);
      });
    });

    describe('VoteRegistrationDelegation', () => {
      const certificate: Cardano.HydratedCertificate = {
        __typename: Cardano.CertificateType.VoteRegistrationDelegation,
        stakeCredential,
        dRep: dRepCredential,
        deposit: DEPOSIT,
      };

      it('renders type, stakeKey, drepId, deposit in order', () => {
        const result = expectItems(
          buildCertificateItems(certificate, baseContext),
        );
        expect(result.items).toEqual([
          typeItem('v2.activity-details.sheet.voteRegistrationDelegation'),
          stakeKeyItem,
          drepFromCredentialItem,
          depositItem,
        ]);
      });
    });

    describe('StakeVoteRegistrationDelegation', () => {
      const certificate: Cardano.HydratedCertificate = {
        __typename: Cardano.CertificateType.StakeVoteRegistrationDelegation,
        stakeCredential,
        poolId: POOL_ID,
        dRep: dRepCredential,
        deposit: DEPOSIT,
      };

      it('renders type, stakeKey, poolId, drepId, deposit in order', () => {
        const result = expectItems(
          buildCertificateItems(certificate, baseContext),
        );
        expect(result.items).toEqual([
          typeItem('v2.activity-details.sheet.stakeVoteRegistrationDelegation'),
          stakeKeyItem,
          poolIdItem,
          drepFromCredentialItem,
          depositItem,
        ]);
      });
    });

    describe('AuthorizeCommitteeHot', () => {
      const certificate: Cardano.HydratedCertificate = {
        __typename: Cardano.CertificateType.AuthorizeCommitteeHot,
        coldCredential: {
          hash: COLD_CREDENTIAL_HASH,
          type: Cardano.CredentialType.KeyHash,
        },
        hotCredential: {
          hash: HOT_CREDENTIAL_HASH,
          type: Cardano.CredentialType.KeyHash,
        },
      };

      it('renders type, coldCredential, hotCredential in order', () => {
        const result = expectItems(
          buildCertificateItems(certificate, baseContext),
        );
        expect(result.items).toEqual([
          typeItem('v2.activity-details.sheet.authorizeCommitteeHot'),
          {
            label: 'v2.activity-details.sheet.coldCredential',
            value: COLD_CREDENTIAL_HASH,
          },
          {
            label: 'v2.activity-details.sheet.hotCredential',
            value: HOT_CREDENTIAL_HASH,
          },
        ]);
      });
    });

    describe('ResignCommitteeCold', () => {
      const certificate: Cardano.HydratedCertificate = {
        __typename: Cardano.CertificateType.ResignCommitteeCold,
        coldCredential: {
          hash: COLD_CREDENTIAL_HASH,
          type: Cardano.CredentialType.KeyHash,
        },
        anchor,
      };

      it('renders type, coldCredential, anchor url in order', () => {
        const result = expectItems(
          buildCertificateItems(certificate, baseContext),
        );
        expect(result.items).toEqual([
          typeItem('v2.activity-details.sheet.resignCommitteeCold'),
          {
            label: 'v2.activity-details.sheet.coldCredential',
            value: COLD_CREDENTIAL_HASH,
          },
          { label: 'v2.activity-details.sheet.url', value: anchor.url },
        ]);
      });

      it('renders an undefined url when no anchor is present', () => {
        const result = expectItems(
          buildCertificateItems({ ...certificate, anchor: null }, baseContext),
        );
        expect(result.items[2]).toEqual({
          label: 'v2.activity-details.sheet.url',
          value: undefined,
        });
      });
    });

    describe('RegisterDelegateRepresentative', () => {
      const baseCertificate: Cardano.HydratedCertificate = {
        __typename: Cardano.CertificateType.RegisterDelegateRepresentative,
        dRepCredential,
        deposit: DEPOSIT,
        anchor: null,
      };

      it('without anchor renders type, drepId, deposit in order', () => {
        const result = expectItems(
          buildCertificateItems(baseCertificate, baseContext),
        );
        expect(result.items).toEqual([
          typeItem('v2.activity-details.sheet.registerDelegateRepresentative'),
          drepFromCredentialItem,
          depositItem,
        ]);
      });

      it('with anchor appends the anchor url and url hash rows', () => {
        const result = expectItems(
          buildCertificateItems({ ...baseCertificate, anchor }, baseContext),
        );
        expect(result.items).toEqual([
          typeItem('v2.activity-details.sheet.registerDelegateRepresentative'),
          drepFromCredentialItem,
          depositItem,
          ...anchorRows,
        ]);
      });
    });

    describe('UnregisterDelegateRepresentative', () => {
      const certificate: Cardano.HydratedCertificate = {
        __typename: Cardano.CertificateType.UnregisterDelegateRepresentative,
        dRepCredential,
        deposit: DEPOSIT,
      };

      it('renders type, drepId, deposit in order', () => {
        const result = expectItems(
          buildCertificateItems(certificate, baseContext),
        );
        expect(result.items).toEqual([
          typeItem(
            'v2.activity-details.sheet.unregisterDelegateRepresentative',
          ),
          drepFromCredentialItem,
          depositItem,
        ]);
      });
    });

    describe('UpdateDelegateRepresentative', () => {
      const baseCertificate: Cardano.HydratedCertificate = {
        __typename: Cardano.CertificateType.UpdateDelegateRepresentative,
        dRepCredential,
        anchor: null,
      };

      it('without anchor renders type and drepId in order', () => {
        const result = expectItems(
          buildCertificateItems(baseCertificate, baseContext),
        );
        expect(result.items).toEqual([
          typeItem('v2.activity-details.sheet.updateDelegateRepresentative'),
          drepFromCredentialItem,
        ]);
      });

      it('with anchor appends the anchor url and url hash rows', () => {
        const result = expectItems(
          buildCertificateItems({ ...baseCertificate, anchor }, baseContext),
        );
        expect(result.items).toEqual([
          typeItem('v2.activity-details.sheet.updateDelegateRepresentative'),
          drepFromCredentialItem,
          ...anchorRows,
        ]);
      });
    });

    describe('StakeRegistration / StakeDeregistration', () => {
      const stakeRegistration: Cardano.HydratedCertificate = {
        __typename: Cardano.CertificateType.StakeRegistration,
        stakeCredential,
      };
      const stakeDeregistration: Cardano.HydratedCertificate = {
        __typename: Cardano.CertificateType.StakeDeregistration,
        stakeCredential,
      };

      it('StakeRegistration renders type and stakeKey in order', () => {
        const result = expectItems(
          buildCertificateItems(stakeRegistration, baseContext),
        );
        expect(result.items).toEqual([
          typeItem('v2.activity-details.sheet.stakeRegistration'),
          stakeKeyItem,
        ]);
      });

      it('StakeDeregistration renders type and stakeKey in order', () => {
        const result = expectItems(
          buildCertificateItems(stakeDeregistration, baseContext),
        );
        expect(result.items).toEqual([
          typeItem('v2.activity-details.sheet.stakeDeregistration'),
          stakeKeyItem,
        ]);
      });
    });

    describe('PoolRetirement', () => {
      const certificate: Cardano.HydratedCertificate = {
        __typename: Cardano.CertificateType.PoolRetirement,
        poolId: POOL_ID,
        epoch: 236 as Cardano.EpochNo,
      };

      it('renders type, poolId, and the epoch as a string in order', () => {
        const result = expectItems(
          buildCertificateItems(certificate, baseContext),
        );
        expect(result.items).toEqual([
          typeItem('v2.activity-details.sheet.poolRetirement'),
          poolIdItem,
          { label: 'v2.activity-details.sheet.epoch', value: '236' },
        ]);
      });
    });

    describe('fallback (MIR / GenesisKeyDelegation / PoolRegistration)', () => {
      it('returns a fallback rendering with the type label and a JSON dump for MIR', () => {
        const certificate = {
          __typename: Cardano.CertificateType.MIR,
          pot: 'reserves',
        } as unknown as Cardano.HydratedCertificate;
        const result = buildCertificateItems(certificate, baseContext);
        expect(result.kind).toBe('fallback');
        if (result.kind !== 'fallback') return;
        expect(result.typeLabel).toBe('v2.activity-details.sheet.mir');
        expect(result.rawJson).toBe(JSON.stringify(certificate));
      });

      it('returns a fallback rendering for GenesisKeyDelegation', () => {
        const certificate = {
          __typename: Cardano.CertificateType.GenesisKeyDelegation,
        } as unknown as Cardano.HydratedCertificate;
        const result = buildCertificateItems(certificate, baseContext);
        expect(result.kind).toBe('fallback');
        if (result.kind !== 'fallback') return;
        expect(result.typeLabel).toBe(
          'v2.activity-details.sheet.genesisKeyDelegation',
        );
      });

      it('returns a fallback rendering for PoolRegistration', () => {
        const certificate = {
          __typename: Cardano.CertificateType.PoolRegistration,
        } as unknown as Cardano.HydratedCertificate;
        const result = buildCertificateItems(certificate, baseContext);
        expect(result.kind).toBe('fallback');
        if (result.kind !== 'fallback') return;
        expect(result.typeLabel).toBe(
          'v2.activity-details.sheet.poolRegistration',
        );
      });
    });
  });

  describe('coinSymbol propagation', () => {
    it('uses the configured coinSymbol when formatting the deposit', () => {
      const certificate: Cardano.HydratedCertificate = {
        __typename: Cardano.CertificateType.Registration,
        stakeCredential,
        deposit: DEPOSIT,
      };
      const result = expectItems(
        buildCertificateItems(certificate, {
          ...baseContext,
          coinSymbol: 'ADA',
        }),
      );
      expect(result.items[2]).toEqual({
        label: 'v2.activity-details.sheet.deposit',
        value: '2.00 ADA',
      });
    });
  });

  describe('poolDescription propagation', () => {
    it('forwards the supplied poolDescription as the value of the poolId row', () => {
      const certificate: Cardano.HydratedCertificate = {
        __typename: Cardano.CertificateType.StakeDelegation,
        stakeCredential,
        poolId: POOL_ID,
      };
      const customPoolDescription = 'custom-pool-description';
      const result = expectItems(
        buildCertificateItems(certificate, {
          ...baseContext,
          poolDescription: customPoolDescription,
        }),
      );
      expect(result.items[1]).toEqual({
        label: 'v2.activity-details.sheet.poolId',
        value: customPoolDescription,
      });
    });
  });
});
