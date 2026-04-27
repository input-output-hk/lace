import { Cardano } from '@cardano-sdk/core';
import { convertLovelacesToAda } from '@lace-contract/cardano-context';
import { type TFunction, useTranslation } from '@lace-contract/i18n';
import {
  Column,
  Divider,
  Row,
  shouldTruncateText,
  Text,
} from '@lace-lib/ui-toolkit';
import React, { useMemo } from 'react';

import { useStakePool } from '../../hooks';
import { getPoolIdFromCertificate } from '../../utils/certificates';
import { drepIDasBech32FromHash } from '../../utils/drepId-from-bech32-hash';

import { ActivityDetailItem } from './ActivityDetailItem';

const getCertificateTypesLabel = (t: TFunction) => ({
  [Cardano.CertificateType.StakeRegistration]: t(
    'v2.activity-details.sheet.stakeRegistration',
  ),
  [Cardano.CertificateType.StakeDeregistration]: t(
    'v2.activity-details.sheet.stakeDeregistration',
  ),
  [Cardano.CertificateType.PoolRegistration]: t(
    'v2.activity-details.sheet.poolRegistration',
  ),
  [Cardano.CertificateType.PoolRetirement]: t(
    'v2.activity-details.sheet.poolRetirement',
  ),
  [Cardano.CertificateType.StakeDelegation]: t(
    'v2.activity-details.sheet.stakeDelegation',
  ),
  [Cardano.CertificateType.MIR]: t('v2.activity-details.sheet.mir'),
  [Cardano.CertificateType.GenesisKeyDelegation]: t(
    'v2.activity-details.sheet.genesisKeyDelegation',
  ),
  [Cardano.CertificateType.Registration]: t(
    'v2.activity-details.sheet.registration',
  ),
  [Cardano.CertificateType.Unregistration]: t(
    'v2.activity-details.sheet.unregistration',
  ),
  [Cardano.CertificateType.VoteDelegation]: t(
    'v2.activity-details.sheet.voteDelegation',
  ),
  [Cardano.CertificateType.StakeVoteDelegation]: t(
    'v2.activity-details.sheet.stakeVoteDelegation',
  ),
  [Cardano.CertificateType.StakeRegistrationDelegation]: t(
    'v2.activity-details.sheet.stakeRegistrationDelegation',
  ),
  [Cardano.CertificateType.VoteRegistrationDelegation]: t(
    'v2.activity-details.sheet.voteRegistrationDelegation',
  ),
  [Cardano.CertificateType.StakeVoteRegistrationDelegation]: t(
    'v2.activity-details.sheet.stakeVoteRegistrationDelegation',
  ),
  [Cardano.CertificateType.AuthorizeCommitteeHot]: t(
    'v2.activity-details.sheet.authorizeCommitteeHot',
  ),
  [Cardano.CertificateType.ResignCommitteeCold]: t(
    'v2.activity-details.sheet.resignCommitteeCold',
  ),
  [Cardano.CertificateType.RegisterDelegateRepresentative]: t(
    'v2.activity-details.sheet.registerDelegateRepresentative',
  ),
  [Cardano.CertificateType.UnregisterDelegateRepresentative]: t(
    'v2.activity-details.sheet.unregisterDelegateRepresentative',
  ),
  [Cardano.CertificateType.UpdateDelegateRepresentative]: t(
    'v2.activity-details.sheet.updateDelegateRepresentative',
  ),
});

const DRepActivityDetail = ({
  dRep,
}: {
  dRep: Cardano.DelegateRepresentative;
}) => {
  const { t } = useTranslation();
  const metadata = {
    alwaysAbstain: Cardano.isDRepAlwaysAbstain(dRep),
    alwaysNoConfidence: Cardano.isDRepAlwaysNoConfidence(dRep),
    ...(Cardano.isDRepCredential(dRep) && {
      drepId: drepIDasBech32FromHash(dRep.hash),
    }),
  };

  return (
    <Column>
      {metadata.alwaysAbstain && (
        <ActivityDetailItem
          label={t('v2.activity-details.sheet.drepId')}
          value={t('v2.activity-details.sheet.alwaysAbstain')}
        />
      )}
      {metadata.alwaysNoConfidence && (
        <ActivityDetailItem
          label={t('v2.activity-details.sheet.drepId')}
          value={t('v2.activity-details.sheet.alwaysNoConfidence')}
        />
      )}
      {metadata.drepId && (
        <ActivityDetailItem
          label={t('v2.activity-details.sheet.drepId')}
          value={metadata.drepId}
        />
      )}
    </Column>
  );
};

export const CertificateDetails = ({
  certificate,
  coinSymbol = 'ADA',
  testID,
  shouldShowDivider = false,
}: {
  certificate: Cardano.HydratedCertificate;
  coinSymbol?: string;
  testID?: string;
  shouldShowDivider?: boolean;
}) => {
  const { t } = useTranslation();
  const certificateTypesLabel = getCertificateTypesLabel(t);
  const poolId = getPoolIdFromCertificate(certificate);
  const pool = useStakePool(poolId);

  const poolDescription = useMemo(() => {
    if (!poolId) return undefined;
    if (!pool) return poolId;

    const { poolName: name, ticker } = pool;

    if (!name && !ticker) return poolId;

    return (
      <Column>
        <Row justifyContent="flex-end">
          <Text.M>
            {name ? (ticker ? `${name} (${ticker})` : name) : `(${ticker})`}
          </Text.M>
        </Row>
        <Row justifyContent="flex-end">
          <Text.M>{shouldTruncateText(poolId)}</Text.M>
        </Row>
      </Column>
    );
  }, [poolId, pool]);

  switch (certificate.__typename) {
    case Cardano.CertificateType.StakeDelegation:
      return (
        <Column testID={testID}>
          <ActivityDetailItem
            label={t('v2.activity-details.sheet.type')}
            value={certificateTypesLabel[certificate.__typename]}
          />
          <ActivityDetailItem
            label={t('v2.activity-details.sheet.poolId')}
            value={poolDescription}
          />
          <ActivityDetailItem
            label={t('v2.activity-details.sheet.stakeKey')}
            value={certificate.stakeCredential.hash}
            shouldShowDivider={true}
          />
        </Column>
      );
    case Cardano.CertificateType.Registration:
    case Cardano.CertificateType.Unregistration:
      return (
        <Column testID={testID}>
          <ActivityDetailItem
            label={t('v2.activity-details.sheet.type')}
            value={certificateTypesLabel[certificate.__typename]}
          />
          <ActivityDetailItem
            label={t('v2.activity-details.sheet.stakeKey')}
            value={certificate.stakeCredential.hash}
          />
          <ActivityDetailItem
            label={t('v2.activity-details.sheet.deposit')}
            value={`${convertLovelacesToAda(
              certificate.deposit,
            )} ${coinSymbol}`}
            shouldShowDivider={true}
          />
        </Column>
      );

    case Cardano.CertificateType.VoteDelegation:
      return (
        <Column testID={testID}>
          <ActivityDetailItem
            label={t('v2.activity-details.sheet.type')}
            value={certificateTypesLabel[certificate.__typename]}
          />
          <ActivityDetailItem
            label={t('v2.activity-details.sheet.stakeKey')}
            value={certificate.stakeCredential.hash}
          />
          <DRepActivityDetail dRep={certificate.dRep} />
          <Divider />
        </Column>
      );

    case Cardano.CertificateType.StakeVoteDelegation:
      return (
        <Column testID={testID}>
          <ActivityDetailItem
            label={t('v2.activity-details.sheet.type')}
            value={certificateTypesLabel[certificate.__typename]}
          />
          <ActivityDetailItem
            label={t('v2.activity-details.sheet.stakeKey')}
            value={certificate.stakeCredential.hash}
          />
          <ActivityDetailItem
            label={t('v2.activity-details.sheet.poolId')}
            value={poolDescription}
          />
          <DRepActivityDetail dRep={certificate.dRep} />

          <Divider />
        </Column>
      );

    case Cardano.CertificateType.StakeRegistrationDelegation:
      return (
        <Column testID={testID}>
          <ActivityDetailItem
            label={t('v2.activity-details.sheet.type')}
            value={certificateTypesLabel[certificate.__typename]}
          />
          <ActivityDetailItem
            label={t('v2.activity-details.sheet.stakeKey')}
            value={certificate.stakeCredential.hash}
          />
          <ActivityDetailItem
            label={t('v2.activity-details.sheet.poolId')}
            value={poolDescription}
          />
          <ActivityDetailItem
            label={t('v2.activity-details.sheet.deposit')}
            value={`${convertLovelacesToAda(
              certificate.deposit,
            )} ${coinSymbol}`}
            shouldShowDivider={true}
          />
        </Column>
      );

    case Cardano.CertificateType.VoteRegistrationDelegation:
      return (
        <Column testID={testID}>
          <ActivityDetailItem
            label={t('v2.activity-details.sheet.type')}
            value={certificateTypesLabel[certificate.__typename]}
          />
          <ActivityDetailItem
            label={t('v2.activity-details.sheet.stakeKey')}
            value={certificate.stakeCredential.hash}
          />
          <DRepActivityDetail dRep={certificate.dRep} />
          <ActivityDetailItem
            label={t('v2.activity-details.sheet.deposit')}
            value={`${convertLovelacesToAda(
              certificate.deposit,
            )} ${coinSymbol}`}
            shouldShowDivider={true}
          />
        </Column>
      );

    case Cardano.CertificateType.StakeVoteRegistrationDelegation:
      return (
        <Column testID={testID}>
          <ActivityDetailItem
            label={t('v2.activity-details.sheet.type')}
            value={certificateTypesLabel[certificate.__typename]}
          />
          <ActivityDetailItem
            label={t('v2.activity-details.sheet.stakeKey')}
            value={certificate.stakeCredential.hash}
          />
          <ActivityDetailItem
            label={t('v2.activity-details.sheet.poolId')}
            value={poolDescription}
          />
          <DRepActivityDetail dRep={certificate.dRep} />
          <ActivityDetailItem
            label={t('v2.activity-details.sheet.deposit')}
            value={`${convertLovelacesToAda(
              certificate.deposit,
            )} ${coinSymbol}`}
            shouldShowDivider={true}
          />
        </Column>
      );

    case Cardano.CertificateType.AuthorizeCommitteeHot:
      return (
        <Column testID={testID}>
          <ActivityDetailItem
            label={t('v2.activity-details.sheet.type')}
            value={certificateTypesLabel[certificate.__typename]}
          />
          <ActivityDetailItem
            label={t('v2.activity-details.sheet.coldCredential')}
            value={certificate.coldCredential.hash}
          />
          <ActivityDetailItem
            label={t('v2.activity-details.sheet.hotCredential')}
            value={certificate.hotCredential.hash}
            shouldShowDivider={true}
          />
        </Column>
      );

    case Cardano.CertificateType.ResignCommitteeCold:
      return (
        <Column testID={testID}>
          <ActivityDetailItem
            label={t('v2.activity-details.sheet.type')}
            value={certificateTypesLabel[certificate.__typename]}
          />
          <ActivityDetailItem
            label={t('v2.activity-details.sheet.coldCredential')}
            value={certificate.coldCredential.hash}
          />
          <ActivityDetailItem
            label={t('v2.activity-details.sheet.url')}
            value={certificate.anchor?.url}
            shouldShowDivider={true}
          />
        </Column>
      );

    case Cardano.CertificateType.RegisterDelegateRepresentative:
      return (
        <Column testID={testID}>
          <ActivityDetailItem
            label={t('v2.activity-details.sheet.type')}
            value={certificateTypesLabel[certificate.__typename]}
          />
          <ActivityDetailItem
            label={t('v2.activity-details.sheet.drepId')}
            value={drepIDasBech32FromHash(certificate.dRepCredential.hash)}
          />
          <ActivityDetailItem
            label={t('v2.activity-details.sheet.deposit')}
            value={`${convertLovelacesToAda(
              certificate.deposit,
            )} ${coinSymbol}`}
          />
          {certificate.anchor && (
            <>
              <ActivityDetailItem
                label={t('v2.activity-details.sheet.anchor')}
                value={certificate.anchor.url}
              />
              <ActivityDetailItem
                label={t('v2.activity-details.sheet.urlHash')}
                value={certificate.anchor.dataHash}
                shouldShowDivider={true}
              />
            </>
          )}
        </Column>
      );

    case Cardano.CertificateType.UnregisterDelegateRepresentative:
      return (
        <Column testID={testID}>
          <ActivityDetailItem
            label={t('v2.activity-details.sheet.type')}
            value={certificateTypesLabel[certificate.__typename]}
          />
          <ActivityDetailItem
            label={t('v2.activity-details.sheet.drepId')}
            value={drepIDasBech32FromHash(certificate.dRepCredential.hash)}
          />
          <ActivityDetailItem
            label={t('v2.activity-details.sheet.deposit')}
            value={`${convertLovelacesToAda(
              certificate.deposit,
            )} ${coinSymbol}`}
            shouldShowDivider={true}
          />
        </Column>
      );

    case Cardano.CertificateType.UpdateDelegateRepresentative:
      return (
        <Column testID={testID}>
          <ActivityDetailItem
            label={t('v2.activity-details.sheet.type')}
            value={certificateTypesLabel[certificate.__typename]}
          />
          <ActivityDetailItem
            label={t('v2.activity-details.sheet.drepId')}
            value={drepIDasBech32FromHash(certificate.dRepCredential.hash)}
          />
          {certificate.anchor && (
            <>
              <ActivityDetailItem
                label={t('v2.activity-details.sheet.anchor')}
                value={certificate.anchor.url}
              />
              <ActivityDetailItem
                label={t('v2.activity-details.sheet.urlHash')}
                value={certificate.anchor.dataHash}
                shouldShowDivider={true}
              />
            </>
          )}
        </Column>
      );

    case Cardano.CertificateType.StakeRegistration:
    case Cardano.CertificateType.StakeDeregistration:
      return (
        <Column testID={testID}>
          <ActivityDetailItem
            label={t('v2.activity-details.sheet.type')}
            value={certificateTypesLabel[certificate.__typename]}
          />
          <ActivityDetailItem
            label={t('v2.activity-details.sheet.stakeKey')}
            value={certificate.stakeCredential.hash}
            shouldShowDivider={shouldShowDivider}
          />
        </Column>
      );

    case Cardano.CertificateType.PoolRetirement:
      return (
        <Column testID={testID}>
          <ActivityDetailItem
            label={t('v2.activity-details.sheet.type')}
            value={certificateTypesLabel[certificate.__typename]}
          />
          <ActivityDetailItem
            label={t('v2.activity-details.sheet.poolId')}
            value={poolDescription}
          />
          <ActivityDetailItem
            label={t('v2.activity-details.sheet.epoch')}
            value={certificate.epoch.toString()}
            shouldShowDivider={true}
          />
        </Column>
      );

    case Cardano.CertificateType.MIR:
    case Cardano.CertificateType.GenesisKeyDelegation:
    case Cardano.CertificateType.PoolRegistration:
    default:
      return (
        <Column testID={testID}>
          <Text.M>{certificateTypesLabel[certificate.__typename]}</Text.M>
          <Text.M variant="secondary">{JSON.stringify(certificate)}</Text.M>
        </Column>
      );
  }
};
