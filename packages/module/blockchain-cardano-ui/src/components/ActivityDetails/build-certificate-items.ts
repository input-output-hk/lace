import type { ReactNode } from 'react';

import { Cardano } from '@cardano-sdk/core';
import { convertLovelacesToAda } from '@lace-contract/cardano-context';

import { drepIDasBech32FromHash } from '../../utils/drepId-from-bech32-hash';

import type { TFunction, TranslationKey } from '@lace-contract/i18n';

export type CertificateItem = { label: string; value: ReactNode };

export type CertificateRendering =
  | { kind: 'fallback'; typeLabel: string; rawJson: string }
  | { kind: 'items'; items: CertificateItem[] };

export type BuildCertificateItemsContext = {
  t: TFunction;
  coinSymbol: string;
  poolDescription: ReactNode;
};

const CERT_TYPE_I18N_KEY: Record<Cardano.CertificateType, TranslationKey> = {
  [Cardano.CertificateType.StakeRegistration]:
    'v2.activity-details.sheet.stakeRegistration',
  [Cardano.CertificateType.StakeDeregistration]:
    'v2.activity-details.sheet.stakeDeregistration',
  [Cardano.CertificateType.PoolRegistration]:
    'v2.activity-details.sheet.poolRegistration',
  [Cardano.CertificateType.PoolRetirement]:
    'v2.activity-details.sheet.poolRetirement',
  [Cardano.CertificateType.StakeDelegation]:
    'v2.activity-details.sheet.stakeDelegation',
  [Cardano.CertificateType.MIR]: 'v2.activity-details.sheet.mir',
  [Cardano.CertificateType.GenesisKeyDelegation]:
    'v2.activity-details.sheet.genesisKeyDelegation',
  [Cardano.CertificateType.Registration]:
    'v2.activity-details.sheet.registration',
  [Cardano.CertificateType.Unregistration]:
    'v2.activity-details.sheet.unregistration',
  [Cardano.CertificateType.VoteDelegation]:
    'v2.activity-details.sheet.voteDelegation',
  [Cardano.CertificateType.StakeVoteDelegation]:
    'v2.activity-details.sheet.stakeVoteDelegation',
  [Cardano.CertificateType.StakeRegistrationDelegation]:
    'v2.activity-details.sheet.stakeRegistrationDelegation',
  [Cardano.CertificateType.VoteRegistrationDelegation]:
    'v2.activity-details.sheet.voteRegistrationDelegation',
  [Cardano.CertificateType.StakeVoteRegistrationDelegation]:
    'v2.activity-details.sheet.stakeVoteRegistrationDelegation',
  [Cardano.CertificateType.AuthorizeCommitteeHot]:
    'v2.activity-details.sheet.authorizeCommitteeHot',
  [Cardano.CertificateType.ResignCommitteeCold]:
    'v2.activity-details.sheet.resignCommitteeCold',
  [Cardano.CertificateType.RegisterDelegateRepresentative]:
    'v2.activity-details.sheet.registerDelegateRepresentative',
  [Cardano.CertificateType.UnregisterDelegateRepresentative]:
    'v2.activity-details.sheet.unregisterDelegateRepresentative',
  [Cardano.CertificateType.UpdateDelegateRepresentative]:
    'v2.activity-details.sheet.updateDelegateRepresentative',
};

export const getCertificateTypeLabel = (
  t: TFunction,
  type: Cardano.CertificateType,
): string => t(CERT_TYPE_I18N_KEY[type]);

const formatDeposit = (deposit: bigint, coinSymbol: string): string =>
  `${convertLovelacesToAda(deposit)} ${coinSymbol}`;

const buildTypeItem = (
  t: TFunction,
  type: Cardano.CertificateType,
): CertificateItem => ({
  label: t('v2.activity-details.sheet.type'),
  value: getCertificateTypeLabel(t, type),
});

const buildStakeKeyItem = (t: TFunction, hash: string): CertificateItem => ({
  label: t('v2.activity-details.sheet.stakeKey'),
  value: hash,
});

const buildPoolIdItem = (
  t: TFunction,
  poolDescription: ReactNode,
): CertificateItem => ({
  label: t('v2.activity-details.sheet.poolId'),
  value: poolDescription,
});

const buildDepositItem = (
  t: TFunction,
  deposit: bigint,
  coinSymbol: string,
): CertificateItem => ({
  label: t('v2.activity-details.sheet.deposit'),
  value: formatDeposit(deposit, coinSymbol),
});

const buildDRepIdItem = (
  t: TFunction,
  credentialHash: Cardano.Credential['hash'],
): CertificateItem => ({
  label: t('v2.activity-details.sheet.drepId'),
  value: drepIDasBech32FromHash(credentialHash),
});

const buildColdCredentialItem = (
  t: TFunction,
  hash: string,
): CertificateItem => ({
  label: t('v2.activity-details.sheet.coldCredential'),
  value: hash,
});

const buildAnchorItems = (
  t: TFunction,
  anchor: Cardano.Anchor | null | undefined,
): CertificateItem[] =>
  anchor
    ? [
        { label: t('v2.activity-details.sheet.anchor'), value: anchor.url },
        {
          label: t('v2.activity-details.sheet.urlHash'),
          value: anchor.dataHash,
        },
      ]
    : [];

export const buildDRepItem = (
  dRep: Cardano.DelegateRepresentative,
  t: TFunction,
): CertificateItem => {
  const label = t('v2.activity-details.sheet.drepId');
  if (Cardano.isDRepAlwaysAbstain(dRep))
    return { label, value: t('v2.activity-details.sheet.alwaysAbstain') };
  if (Cardano.isDRepAlwaysNoConfidence(dRep))
    return { label, value: t('v2.activity-details.sheet.alwaysNoConfidence') };
  if (Cardano.isDRepCredential(dRep))
    return { label, value: drepIDasBech32FromHash(dRep.hash) };
  return { label, value: undefined };
};

export const buildCertificateItems = (
  certificate: Cardano.HydratedCertificate,
  context: BuildCertificateItemsContext,
): CertificateRendering => {
  const { t, coinSymbol, poolDescription } = context;

  switch (certificate.__typename) {
    case Cardano.CertificateType.StakeDelegation:
      return {
        kind: 'items',
        items: [
          buildTypeItem(t, certificate.__typename),
          buildPoolIdItem(t, poolDescription),
          buildStakeKeyItem(t, certificate.stakeCredential.hash),
        ],
      };

    case Cardano.CertificateType.Registration:
    case Cardano.CertificateType.Unregistration:
      return {
        kind: 'items',
        items: [
          buildTypeItem(t, certificate.__typename),
          buildStakeKeyItem(t, certificate.stakeCredential.hash),
          buildDepositItem(t, certificate.deposit, coinSymbol),
        ],
      };

    case Cardano.CertificateType.VoteDelegation:
      return {
        kind: 'items',
        items: [
          buildTypeItem(t, certificate.__typename),
          buildStakeKeyItem(t, certificate.stakeCredential.hash),
          buildDRepItem(certificate.dRep, t),
        ],
      };

    case Cardano.CertificateType.StakeVoteDelegation:
      return {
        kind: 'items',
        items: [
          buildTypeItem(t, certificate.__typename),
          buildStakeKeyItem(t, certificate.stakeCredential.hash),
          buildPoolIdItem(t, poolDescription),
          buildDRepItem(certificate.dRep, t),
        ],
      };

    case Cardano.CertificateType.StakeRegistrationDelegation:
      return {
        kind: 'items',
        items: [
          buildTypeItem(t, certificate.__typename),
          buildStakeKeyItem(t, certificate.stakeCredential.hash),
          buildPoolIdItem(t, poolDescription),
          buildDepositItem(t, certificate.deposit, coinSymbol),
        ],
      };

    case Cardano.CertificateType.VoteRegistrationDelegation:
      return {
        kind: 'items',
        items: [
          buildTypeItem(t, certificate.__typename),
          buildStakeKeyItem(t, certificate.stakeCredential.hash),
          buildDRepItem(certificate.dRep, t),
          buildDepositItem(t, certificate.deposit, coinSymbol),
        ],
      };

    case Cardano.CertificateType.StakeVoteRegistrationDelegation:
      return {
        kind: 'items',
        items: [
          buildTypeItem(t, certificate.__typename),
          buildStakeKeyItem(t, certificate.stakeCredential.hash),
          buildPoolIdItem(t, poolDescription),
          buildDRepItem(certificate.dRep, t),
          buildDepositItem(t, certificate.deposit, coinSymbol),
        ],
      };

    case Cardano.CertificateType.AuthorizeCommitteeHot:
      return {
        kind: 'items',
        items: [
          buildTypeItem(t, certificate.__typename),
          buildColdCredentialItem(t, certificate.coldCredential.hash),
          {
            label: t('v2.activity-details.sheet.hotCredential'),
            value: certificate.hotCredential.hash,
          },
        ],
      };

    case Cardano.CertificateType.ResignCommitteeCold:
      return {
        kind: 'items',
        items: [
          buildTypeItem(t, certificate.__typename),
          buildColdCredentialItem(t, certificate.coldCredential.hash),
          {
            label: t('v2.activity-details.sheet.url'),
            value: certificate.anchor?.url,
          },
        ],
      };

    case Cardano.CertificateType.RegisterDelegateRepresentative:
      return {
        kind: 'items',
        items: [
          buildTypeItem(t, certificate.__typename),
          buildDRepIdItem(t, certificate.dRepCredential.hash),
          buildDepositItem(t, certificate.deposit, coinSymbol),
          ...buildAnchorItems(t, certificate.anchor),
        ],
      };

    case Cardano.CertificateType.UnregisterDelegateRepresentative:
      return {
        kind: 'items',
        items: [
          buildTypeItem(t, certificate.__typename),
          buildDRepIdItem(t, certificate.dRepCredential.hash),
          buildDepositItem(t, certificate.deposit, coinSymbol),
        ],
      };

    case Cardano.CertificateType.UpdateDelegateRepresentative:
      return {
        kind: 'items',
        items: [
          buildTypeItem(t, certificate.__typename),
          buildDRepIdItem(t, certificate.dRepCredential.hash),
          ...buildAnchorItems(t, certificate.anchor),
        ],
      };

    case Cardano.CertificateType.StakeRegistration:
    case Cardano.CertificateType.StakeDeregistration:
      return {
        kind: 'items',
        items: [
          buildTypeItem(t, certificate.__typename),
          buildStakeKeyItem(t, certificate.stakeCredential.hash),
        ],
      };

    case Cardano.CertificateType.PoolRetirement:
      return {
        kind: 'items',
        items: [
          buildTypeItem(t, certificate.__typename),
          buildPoolIdItem(t, poolDescription),
          {
            label: t('v2.activity-details.sheet.epoch'),
            value: certificate.epoch.toString(),
          },
        ],
      };

    case Cardano.CertificateType.MIR:
    case Cardano.CertificateType.GenesisKeyDelegation:
    case Cardano.CertificateType.PoolRegistration:
    default:
      return {
        kind: 'fallback',
        typeLabel: getCertificateTypeLabel(t, certificate.__typename),
        rawJson: JSON.stringify(certificate),
      };
  }
};
