/* eslint-disable unicorn/consistent-destructuring */
import { Wallet } from '@lace/cardano';
import {
  AssetActivityItemProps,
  TxDetails,
  TxDetailsCertificateTitles,
  TxDetailsVotingProceduresTitles,
  TxDetailsProposalProceduresTitles
} from '@lace/core';
import { inspectTxType } from '../../../../../utils/tx-inspection';

const { CertificateType } = Wallet.Cardano;

const conwayEraCertificatesTypes = new Set([
  CertificateType.AuthorizeCommitteeHot,
  CertificateType.RegisterDelegateRepresentative,
  CertificateType.ResignCommitteeCold,
  CertificateType.VoteRegistrationDelegation,
  CertificateType.VoteDelegation,
  CertificateType.UpdateDelegateRepresentative,
  CertificateType.UpdateDelegateRepresentative,
  CertificateType.UnregisterDelegateRepresentative,
  CertificateType.StakeVoteRegistrationDelegation,
  CertificateType.StakeVoteDelegation
]);

type TransformedTx = Omit<AssetActivityItemProps, 'onClick'>;

export const splitDelegationWithDeregistrationIntoTwoActions = (tx: TransformedTx): [TransformedTx, TransformedTx] => [
  {
    ...tx,
    type: 'delegation',
    // Reclaimed deposit already shown in the delegationDeregistration
    depositReclaim: undefined
  },
  {
    ...tx,
    type: 'delegationDeregistration',
    // Let de-registration show just the returned deposit,
    // and the other transaction show fee to avoid duplicity
    fee: '0'
  }
];

// If a delegation transaction has also any reclaimed deposit (deregistration certificates),
// we want to split it into two separate actions for clarity
export const isDelegationWithDeregistrationTx = (tx: TransformedTx, type: ReturnType<typeof inspectTxType>): boolean =>
  type === 'delegation' && !!tx.depositReclaim;

export const splitDelegationWithRegistrationIntoTwoActions = (tx: TransformedTx): [TransformedTx, TransformedTx] => [
  {
    ...tx,
    type: 'delegation',
    // Deposit already shown in the delegationDeregistration
    deposit: undefined
  },
  {
    ...tx,
    type: 'delegationRegistration',
    // Let registration show just the deposit,
    // and the other transaction show fee to avoid duplicity
    fee: '0'
  }
];

// If a delegation transaction has also any deposit (registration certificates),
// we want to split it into two separate actions for clarity
export const isDelegationWithRegistrationTx = (tx: TransformedTx, type: ReturnType<typeof inspectTxType>): boolean =>
  type === 'delegation' && !!tx.deposit;

const drepMapper = (drep: Wallet.Cardano.DelegateRepresentative) => {
  if (Wallet.Cardano.isDRepAlwaysAbstain(drep)) {
    return 'alwaysAbstain';
  } else if (Wallet.Cardano.isDRepAlwaysNoConfidence(drep)) {
    return 'alwaysNoConfidence';
  }
  return Wallet.Cardano.DRepID(Wallet.HexBlob.toTypedBech32('drep', Wallet.HexBlob(drep.hash)));
};

type TransactionCertificate = {
  __typename: Wallet.Cardano.CertificateType;
  deposit?: BigInt;
  dRep?: Wallet.Cardano.DelegateRepresentative;
  coldCredential?: Wallet.Cardano.Credential;
  hotCredential?: Wallet.Cardano.Credential;
  dRepCredential?: Wallet.Cardano.Credential;
  anchor?: Wallet.Cardano.Anchor;
};

type TransactionGovernanceProposal = {
  deposit: BigInt;
  rewardAccount: Wallet.Cardano.RewardAccount;
  anchor: Wallet.Cardano.Anchor;
  governanceAction: {
    __typename: Wallet.Cardano.GovernanceActionType;
    governanceActionId?: Wallet.Cardano.GovernanceActionId;
    protocolParamUpdate?: Wallet.Cardano.ProtocolParametersUpdate;
    protocolVersion?: Wallet.Cardano.ProtocolVersion;
    withdrawals?: Set<{
      rewardAccount: Wallet.Cardano.RewardAccount;
      coin: BigInt;
    }>;
    membersToBeRemoved?: Set<Wallet.Cardano.Credential>;
    membersToBeAdded?: Set<Wallet.Cardano.CommitteeMember>;
    newQuorumThreshold?: Wallet.Cardano.Fraction;
    constitution?: Wallet.Cardano.Constitution;
  };
};

export const certificateTransformer = (
  cardanoCoin: Wallet.CoinId,
  certificates?: TransactionCertificate[]
): TxDetails<TxDetailsCertificateTitles>[] =>
  // Currently only show enhanced certificate info for conway era certificates pending further discussion
  certificates
    ?.filter((certificate) => conwayEraCertificatesTypes.has(certificate.__typename))
    .map((conwayEraCertificate) => {
      const transformedCertificate: TxDetails<TxDetailsCertificateTitles> = [
        { title: 'certificateType', details: [conwayEraCertificate.__typename] }
      ];

      if (conwayEraCertificate.anchor) {
        transformedCertificate.push({
          title: 'anchor',
          details: [conwayEraCertificate.anchor.url, conwayEraCertificate.anchor.dataHash]
        });
      }

      if (conwayEraCertificate.dRep) {
        transformedCertificate.push({
          title: 'drep',
          details: [drepMapper(conwayEraCertificate.dRep)]
        });
      }

      if (conwayEraCertificate.coldCredential) {
        transformedCertificate.push({
          title: 'coldCredential',
          details: [conwayEraCertificate.coldCredential.hash]
        });
      }

      if (conwayEraCertificate.hotCredential) {
        transformedCertificate.push({
          title: 'hotCredential',
          details: [conwayEraCertificate.hotCredential.hash]
        });
      }

      if (conwayEraCertificate.dRepCredential) {
        transformedCertificate.push({
          title: 'drepCredential',
          details: [conwayEraCertificate.dRepCredential.hash]
        });
      }

      if (conwayEraCertificate.deposit) {
        transformedCertificate.push({
          title: 'depositPaid',
          details: [Wallet.util.lovelacesToAdaString(conwayEraCertificate.deposit.toString()) + cardanoCoin.symbol]
        });
      }

      return transformedCertificate;
    });

const getVoterType = (voterType: Wallet.Cardano.VoterType): string => {
  switch (voterType) {
    case Wallet.Cardano.VoterType.ccHotKeyHash:
    case Wallet.Cardano.VoterType.ccHotScriptHash:
      return 'Constitutional Committee';
    case Wallet.Cardano.VoterType.stakePoolKeyHash:
      return 'SPO';
    case Wallet.Cardano.VoterType.dRepKeyHash:
    case Wallet.Cardano.VoterType.dRepScriptHash:
    default:
      return 'DRep';
  }
};

const getVote = (vote: Wallet.Cardano.Vote): string => {
  switch (vote) {
    case Wallet.Cardano.Vote.yes:
      return 'Yes';
    case Wallet.Cardano.Vote.no:
      return 'No';
    case Wallet.Cardano.Vote.abstain:
    default:
      return 'Abstain';
  }
};

export const votingProceduresTransformer = (
  votingProcedures: Wallet.Cardano.VotingProcedures
): TxDetails<TxDetailsVotingProceduresTitles>[] => {
  const votingProcedureDetails: TxDetails<TxDetailsVotingProceduresTitles>[] = [];

  votingProcedures?.forEach((procedure) =>
    procedure.votes.forEach((vote) => {
      const voterType = getVoterType(procedure.voter.__typename);
      const voterCredential =
        voterType === 'DRep'
          ? Wallet.Cardano.DRepID(Wallet.HexBlob.toTypedBech32('drep', Wallet.HexBlob(procedure.voter.credential.hash)))
          : procedure.voter.credential.hash;
      votingProcedureDetails.push([
        {
          title: 'voterType',
          details: [voterType]
        },
        {
          title: 'voterCredential',
          details: [voterCredential]
        },
        { title: 'vote', details: [getVote(vote.votingProcedure.vote)] },
        { ...(!!vote.votingProcedure.anchor && { title: 'anchor', details: [vote.votingProcedure.anchor.url] }) },
        { title: 'proposalTxHash', details: [vote.actionId.id, vote.actionId.actionIndex.toString()] }
      ]);
    })
  );

  return votingProcedureDetails;
};

export const governanceProposalsTransformer = (
  cardanoCoin: Wallet.CoinId,
  proposalProcedures?: TransactionGovernanceProposal[]
): TxDetails<TxDetailsProposalProceduresTitles>[] =>
  proposalProcedures?.map(
    ({
      governanceAction: {
        __typename,
        governanceActionId: { id: actionId, actionIndex },
        protocolParamUpdate,
        protocolVersion: { major, minor, patch },
        withdrawals,
        membersToBeRemoved,
        membersToBeAdded,
        newQuorumThreshold,
        constitution
      },
      deposit,
      anchor,
      rewardAccount
    }) => {
      // Default details across all proposals
      const transformedProposal: TxDetails<TxDetailsProposalProceduresTitles> = [
        { title: 'type', details: [__typename] },
        {
          title: 'governanceActionId',
          details: [Wallet.util.lovelacesToAdaString(deposit.toString()) + cardanoCoin.symbol]
        },
        {
          title: 'rewardAccount',
          details: [rewardAccount]
        },
        {
          title: 'anchor',
          details: [anchor.url, anchor.dataHash]
        }
      ];

      // Proposal-specific properties
      switch (__typename) {
        case Wallet.Cardano.GovernanceActionType.parameter_change_action: {
          transformedProposal.push({
            title: 'protocolParamUpdate',
            details: Object.entries(protocolParamUpdate).map(
              ([parameter, proposedValue]) => `${parameter}: ${proposedValue.toString()}`
            )
          });
          break;
        }
        case Wallet.Cardano.GovernanceActionType.hard_fork_initiation_action: {
          const compiledProtovolVersion = [major, minor, patch].filter((x) => !!x).join('.');
          if (actionId) {
            transformedProposal.push({
              title: 'governanceActionId',
              details: [actionId, actionIndex.toString()]
            });
          }

          transformedProposal.push({
            title: 'protocolVersion',
            details: [compiledProtovolVersion]
          });
          break;
        }
        case Wallet.Cardano.GovernanceActionType.treasury_withdrawals_action: {
          const treasuryWithdrawals: string[] = [];

          withdrawals.forEach(({ rewardAccount: withdrawalRewardAccount, coin }) => {
            treasuryWithdrawals.push(
              `${withdrawalRewardAccount}: ${Wallet.util.lovelacesToAdaString(coin.toString()) + cardanoCoin.symbol}`
            );
          });

          transformedProposal.push({
            title: 'withdrawals',
            details: treasuryWithdrawals
          });
          break;
        }
        case Wallet.Cardano.GovernanceActionType.no_confidence: {
          if (actionId) {
            transformedProposal.push({
              title: 'governanceActionId',
              details: [actionId, actionIndex.toString()]
            });
          }
          break;
        }
        case Wallet.Cardano.GovernanceActionType.update_committee: {
          const membersToBeRemovedDetails: string[] = [];
          const membersToBeAddedDetails: string[] = [];

          membersToBeRemoved.forEach(({ hash }) => {
            membersToBeRemovedDetails.push(hash);
          });

          membersToBeAdded.forEach(({ coldCredential }) => {
            membersToBeAddedDetails.push(coldCredential.hash);
          });

          if (actionId) {
            transformedProposal.push({
              title: 'governanceActionId',
              details: [actionId, actionIndex.toString()]
            });
          }

          transformedProposal.push(
            {
              title: 'membersToBeAdded',
              details: membersToBeAddedDetails
            },
            {
              title: 'membersToBeRemoved',
              details: membersToBeRemovedDetails
            },
            {
              title: 'newQuorumThreshold',
              details: [`${newQuorumThreshold.numerator}\\${newQuorumThreshold.denominator}`]
            }
          );
          break;
        }
        case Wallet.Cardano.GovernanceActionType.new_constitution: {
          transformedProposal.push({
            title: 'constitutionAnchor',
            details: [constitution.anchor.url, constitution.anchor.dataHash]
          });
        }
      }

      return transformedProposal;
    }
  );
