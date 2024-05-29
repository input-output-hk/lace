/* eslint-disable complexity */
/* eslint-disable sonarjs/no-duplicate-string */
import React from 'react';
import { Wallet } from '@lace/cardano';
import { ConfirmStakeRegistrationDelegation } from '@src/ui/components/ConfirmStakeRegistrationDelegation';
import { ConfirmStakeVoteDelegation } from '@src/ui/components/ConfirmStakeVoteDelegation';
import { ConfirmStakeVoteRegistrationDelegation } from '@src/ui/components/ConfirmStakeVoteRegistrationDelegation';
import { ConfirmVoteRegistrationDelegation } from '@src/ui/components/ConfirmVoteRegistrationDelegation';
import { ConfirmDRepRegistration } from '@src/ui/components/ConfirmDRepRegistration';
import { ConfirmDRepRetirement } from '@src/ui/components/ConfirmDRepRetirement';
import { ConfirmDRepUpdate } from '@src/ui/components/ConfirmDRepUpdate';
import { ConfirmVoteDelegation } from '@src/ui/components/ConfirmVoteDelegation';
import { AuthorizeCommitteeCertificate } from '@src/ui/components/AuthorizeCommitteeCertificate';
import { ResignCommitteeCertificate } from '@src/ui/components/ResignCommitteeCertificate';
import { Cell, Grid, TransactionSummary } from '@lace/ui';
import { useTranslation } from 'react-i18next';

interface CertificateViewProps {
  chainNetworkId: Wallet.Cardano.NetworkId;
  certificate: Wallet.Cardano.Certificate;
  cardanoCoin: Wallet.CoinId;
}

const { CertificateType, RewardAddress } = Wallet.Cardano;

const isNewStakeAddressCertificate = (
  cert: Wallet.Cardano.Certificate
): cert is Wallet.Cardano.NewStakeAddressCertificate => {
  const { __typename } = cert;
  return __typename === CertificateType.Registration || __typename === CertificateType.Unregistration;
};

export const CertificateView = ({
  certificate,
  chainNetworkId,
  cardanoCoin
}: CertificateViewProps): React.ReactElement => {
  const { t } = useTranslation();

  switch (certificate.__typename) {
    case CertificateType.StakeVoteDelegation:
      return (
        <ConfirmStakeVoteDelegation
          metadata={{
            poolId: certificate.poolId,
            stakeKeyHash: RewardAddress.fromCredentials(chainNetworkId, certificate.stakeCredential)
              .toAddress()
              .toBech32(),
            alwaysAbstain: Wallet.Cardano.isDRepAlwaysAbstain(certificate.dRep),
            alwaysNoConfidence: Wallet.Cardano.isDRepAlwaysNoConfidence(certificate.dRep),
            ...(Wallet.Cardano.isDRepCredential(certificate.dRep)
              ? { drepId: Wallet.util.drepIDasBech32FromHash(certificate.dRep.hash) }
              : {})
          }}
        />
      );
    case CertificateType.StakeRegistrationDelegation:
      return (
        <ConfirmStakeRegistrationDelegation
          metadata={{
            depositPaid: `${certificate.deposit} ${cardanoCoin.symbol}`,
            poolId: certificate.poolId,
            stakeKeyHash: RewardAddress.fromCredentials(chainNetworkId, certificate.stakeCredential)
              .toAddress()
              .toBech32()
          }}
        />
      );
    case CertificateType.StakeVoteRegistrationDelegation:
      return (
        <ConfirmStakeVoteRegistrationDelegation
          metadata={{
            poolId: certificate.poolId,
            stakeKeyHash: RewardAddress.fromCredentials(chainNetworkId, certificate.stakeCredential)
              .toAddress()
              .toBech32(),
            depositPaid: `${certificate.deposit} ${cardanoCoin.symbol}`,
            alwaysAbstain: Wallet.Cardano.isDRepAlwaysAbstain(certificate.dRep),
            alwaysNoConfidence: Wallet.Cardano.isDRepAlwaysNoConfidence(certificate.dRep),
            ...(Wallet.Cardano.isDRepCredential(certificate.dRep)
              ? { drepId: Wallet.util.drepIDasBech32FromHash(certificate.dRep.hash) }
              : {})
          }}
        />
      );
    case CertificateType.VoteRegistrationDelegation:
      return (
        <ConfirmVoteRegistrationDelegation
          metadata={{
            depositPaid: `${certificate.deposit} ${cardanoCoin.symbol}`,
            stakeKeyHash: RewardAddress.fromCredentials(chainNetworkId, certificate.stakeCredential)
              .toAddress()
              .toBech32(),
            alwaysAbstain: Wallet.Cardano.isDRepAlwaysAbstain(certificate.dRep),
            alwaysNoConfidence: Wallet.Cardano.isDRepAlwaysNoConfidence(certificate.dRep),
            ...(Wallet.Cardano.isDRepCredential(certificate.dRep)
              ? { drepId: Wallet.util.drepIDasBech32FromHash(certificate.dRep.hash) }
              : {})
          }}
        />
      );
    case CertificateType.RegisterDelegateRepresentative:
      return (
        <ConfirmDRepRegistration
          metadata={{
            depositPaid: `${certificate.deposit} ${cardanoCoin.symbol}`,
            drepId: Wallet.util.drepIDasBech32FromHash(certificate.dRepCredential.hash),
            hash: certificate.anchor?.dataHash,
            url: certificate.anchor?.url
          }}
        />
      );
    case CertificateType.UnregisterDelegateRepresentative:
      return (
        <ConfirmDRepRetirement
          metadata={{
            depositReturned: `${certificate.deposit} ${cardanoCoin.symbol}`,
            drepId: Wallet.util.drepIDasBech32FromHash(certificate.dRepCredential.hash)
          }}
        />
      );
    case CertificateType.UpdateDelegateRepresentative:
      return (
        <ConfirmDRepUpdate
          metadata={{
            drepId: Wallet.util.drepIDasBech32FromHash(certificate.dRepCredential.hash),
            hash: certificate.anchor?.dataHash,
            url: certificate.anchor?.url
          }}
        />
      );
    case CertificateType.VoteDelegation:
      return (
        <ConfirmVoteDelegation
          metadata={{
            alwaysAbstain: Wallet.Cardano.isDRepAlwaysAbstain(certificate.dRep),
            alwaysNoConfidence: Wallet.Cardano.isDRepAlwaysNoConfidence(certificate.dRep),
            ...(Wallet.Cardano.isDRepCredential(certificate.dRep) && {
              drepId: Wallet.util.drepIDasBech32FromHash(certificate.dRep.hash)
            })
          }}
        />
      );
    case CertificateType.AuthorizeCommitteeHot:
      return (
        <AuthorizeCommitteeCertificate
          metadata={{
            coldCredential: certificate.coldCredential.hash.toString(),
            hotCredential: certificate.hotCredential.hash.toString()
          }}
        />
      );
    case CertificateType.ResignCommitteeCold:
      return (
        <ResignCommitteeCertificate
          metadata={{
            coldCredential: certificate.coldCredential.hash.toString(),
            hash: certificate.anchor?.dataHash,
            url: certificate.anchor?.url
          }}
        />
      );
    case CertificateType.StakeRegistration:
    case CertificateType.Registration:
      return (
        <Grid columns="$1" gutters="$20">
          <Cell>
            <TransactionSummary.Address
              label={t('core.activityDetails.certificateTitles.certificateType')}
              address={t('core.assetActivityItem.entry.name.StakeRegistrationCertificate')}
              testID="metadata-cetificateType"
            />
          </Cell>
          <Cell>
            <TransactionSummary.Address
              label={t('core.ProposalProcedure.txDetails.rewardAccount')}
              address={RewardAddress.fromCredentials(chainNetworkId, certificate.stakeCredential)
                .toAddress()
                .toBech32()}
            />
          </Cell>
          <Cell>
            {!!isNewStakeAddressCertificate(certificate) && (
              <TransactionSummary.Address
                label={t('core.activityDetails.certificateTitles.depositPaid')}
                address={Wallet.util.getFormattedAmount({
                  amount: certificate.deposit.toString(),
                  cardanoCoin
                })}
              />
            )}
          </Cell>
        </Grid>
      );
    case CertificateType.StakeDeregistration:
    case CertificateType.Unregistration:
      return (
        <Grid columns="$1" gutters="$20">
          <Cell>
            <TransactionSummary.Address
              label={t('core.activityDetails.certificateTitles.certificateType')}
              address={t('core.assetActivityItem.entry.name.StakeDeRegistrationCertificate')}
              testID="metadata-cetificateType"
            />
          </Cell>
          <Cell>
            <TransactionSummary.Address
              label={t('core.ProposalProcedure.txDetails.rewardAccount')}
              address={RewardAddress.fromCredentials(chainNetworkId, certificate.stakeCredential)
                .toAddress()
                .toBech32()}
            />
          </Cell>
          <Cell>
            {!!isNewStakeAddressCertificate(certificate) && (
              <TransactionSummary.Address
                label={t('core.activityDetails.certificateTitles.depositReturned')}
                address={Wallet.util.getFormattedAmount({
                  amount: certificate.deposit.toString(),
                  cardanoCoin
                })}
              />
            )}
          </Cell>
        </Grid>
      );
    case CertificateType.StakeDelegation:
      return (
        <Grid columns="$1" gutters="$20">
          <Cell>
            <TransactionSummary.Address
              label={t('core.activityDetails.certificateTitles.certificateType')}
              address={t('core.assetActivityItem.entry.name.StakeDelegationCertificate')}
              testID="metadata-cetificateType"
            />
          </Cell>
          <Cell>
            <TransactionSummary.Address
              label={t('core.ProposalProcedure.txDetails.rewardAccount')}
              address={RewardAddress.fromCredentials(chainNetworkId, certificate.stakeCredential)
                .toAddress()
                .toBech32()}
            />
          </Cell>
          <Cell>
            <TransactionSummary.Address
              label={t('core.activityDetails.certificateTitles.poolId')}
              address={certificate.poolId}
            />
          </Cell>
        </Grid>
      );
    default:
      throw new Error(`Not supported certificate: ${certificate.__typename}`);
  }
};
