import BigNumber from 'bignumber.js';
import { Wallet } from '@lace/cardano';
import { CurrencyInfo, TxDirections } from '@types';
import { inspectTxValues, inspectTxType, getVoterType, VoterTypeEnum, getVote } from '@src/utils/tx-inspection';
import { formatDate, formatTime } from '@src/utils/format-date';
import { getTransactionTotalAmount } from '@src/utils/get-transaction-total-amount';
import type { TransformedActivity, TransformedTransactionActivity } from './types';
import {
  ActivityStatus,
  DelegationTransactionType,
  TxDetails,
  TxDetailsCertificateTitles,
  TxDetailsVotingProceduresTitles,
  TxDetailsProposalProceduresTitles,
  ConwayEraCertificatesTypes,
  TxDetail
} from '@lace/core';
import capitalize from 'lodash/capitalize';
import dayjs from 'dayjs';
import isEmpty from 'lodash/isEmpty';

const { util, GovernanceActionType } = Wallet.Cardano;

export interface TxTransformerInput {
  tx: Wallet.TxInFlight | Wallet.Cardano.HydratedTx;
  walletAddresses: Wallet.KeyManagement.GroupedAddress[];
  fiatCurrency: CurrencyInfo;
  fiatPrice?: number;
  protocolParameters: Wallet.ProtocolParameters;
  cardanoCoin: Wallet.CoinId;
  date: Date;
  direction?: TxDirections;
  status?: Wallet.TransactionStatus;
  resolveInput: Wallet.Cardano.ResolveInput;
}

export const getFormattedFiatAmount = ({
  amount,
  fiatPrice,
  fiatCurrency
}: {
  amount: BigNumber;
  fiatPrice: number;
  fiatCurrency: CurrencyInfo;
}): string => {
  const fiatAmount = fiatPrice
    ? Wallet.util.lovelacesToAdaString(amount.times(new BigNumber(fiatPrice)).toString())
    : '';
  return fiatAmount ? `${fiatAmount} ${fiatCurrency.code}` : '-';
};

const splitDelegationTx = (tx: TransformedActivity): TransformedTransactionActivity[] => {
  if (tx.deposit) {
    return [
      {
        ...tx,
        type: DelegationTransactionType.delegation,
        // Deposit already shown in the delegationRegistration
        deposit: undefined
      },
      {
        ...tx,
        type: DelegationTransactionType.delegationRegistration,
        // Let registration show just the deposit,
        // and the other transaction show fee to avoid duplicity
        fee: '0'
      }
    ];
  } else if (tx.depositReclaim) {
    return [
      {
        ...tx,
        type: DelegationTransactionType.delegation,
        // Reclaimed deposit already shown in the delegationDeregistration
        depositReclaim: undefined
      },
      {
        ...tx,
        type: DelegationTransactionType.delegationDeregistration,
        // Let de-registration show just the returned deposit,
        // and the other transaction show fee to avoid duplicity
        fee: '0'
      }
    ];
  }

  return [
    {
      ...tx,
      type: DelegationTransactionType.delegation
    }
  ];
};

const transformTransactionStatus = (status: Wallet.TransactionStatus): ActivityStatus => {
  const statuses = {
    [Wallet.TransactionStatus.PENDING]: ActivityStatus.PENDING,
    [Wallet.TransactionStatus.ERROR]: ActivityStatus.ERROR,
    [Wallet.TransactionStatus.SUCCESS]: ActivityStatus.SUCCESS,
    [Wallet.TransactionStatus.SPENDABLE]: ActivityStatus.SPENDABLE
  };
  return statuses[status];
};
/**
  Simplifies the transaction object to be used in the activity list

  @param tx the transaction object
  @param walletAddresses the addresses of the wallet and the reward account
  @param fiatCurrency the fiat currency details
  @param fiatPrice the fiat price of ADA
  @param protocolParameters the protocol parameters
  @param cardanoCoin the ADA coin details
  @param time the time of the transaction
  @param direction the direction of the transaction
  @param status the status of the transaction
  @param date the date of the transaction
 */

export const txTransformer = async ({
  tx,
  walletAddresses,
  fiatCurrency,
  fiatPrice,
  protocolParameters,
  cardanoCoin,
  date,
  direction,
  status,
  resolveInput
}: TxTransformerInput): Promise<TransformedTransactionActivity[]> => {
  const implicitCoin = util.computeImplicitCoin(protocolParameters, tx.body);
  const deposit = implicitCoin.deposit ? Wallet.util.lovelacesToAdaString(implicitCoin.deposit.toString()) : undefined;
  const depositReclaimValue = Wallet.util.calculateDepositReclaim(implicitCoin);
  const depositReclaim = depositReclaimValue
    ? Wallet.util.lovelacesToAdaString(depositReclaimValue.toString())
    : undefined;
  const { assets } = inspectTxValues({
    addresses: walletAddresses,
    tx: tx as unknown as Wallet.Cardano.HydratedTx,
    direction
  });
  const outputAmount = await getTransactionTotalAmount({
    addresses: walletAddresses,
    inputs: tx.body.inputs,
    outputs: tx.body.outputs,
    fee: tx.body.fee,
    direction,
    withdrawals: tx.body.withdrawals,
    resolveInput
  });
  const formattedDate = dayjs().isSame(date, 'day')
    ? 'Today'
    : formatDate({ date, format: 'DD MMMM YYYY', type: 'local' });
  const formattedTimestamp = formatTime({
    date,
    type: 'local'
  });

  const assetsEntries = assets
    ? [...assets.entries()]
        .map(([id, val]) => ({ id: id.toString(), val: val.toString() }))
        .sort((a, b) => Number(b.val) - Number(a.val))
    : [];

  const baseTransformedActivity = {
    id: tx.id.toString(),
    deposit,
    depositReclaim,
    fee: Wallet.util.lovelacesToAdaString(tx.body.fee.toString()),
    status: transformTransactionStatus(status),
    amount: Wallet.util.getFormattedAmount({ amount: outputAmount.toString(), cardanoCoin }),
    fiatAmount: getFormattedFiatAmount({ amount: outputAmount, fiatCurrency, fiatPrice }),
    assets: assetsEntries,
    assetsNumber: (assets?.size ?? 0) + 1,
    date,
    formattedDate:
      status === Wallet.TransactionStatus.PENDING ? capitalize(Wallet.TransactionStatus.PENDING) : formattedDate,
    formattedTimestamp
  };

  // Note that TxInFlight at type level does not expose its inputs with address,
  // which would prevent `inspectTxType` from determining whether tx is incoming or outgoing.
  // However at runtime, the "address" property is present (ATM) and the call below works.
  // SDK Ticket LW-8767 should fix the type of Input in TxInFlight to contain the address
  const type = inspectTxType({ walletAddresses, tx: tx as unknown as Wallet.Cardano.HydratedTx });

  if (type === DelegationTransactionType.delegation) {
    return splitDelegationTx(baseTransformedActivity);
  }

  return [
    {
      ...baseTransformedActivity,
      type,
      direction
    }
  ];
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

const drepMapper = (drep: Wallet.Cardano.DelegateRepresentative) => {
  switch (true) {
    case Wallet.Cardano.isDRepAlwaysAbstain(drep):
      return 'alwaysAbstain';
    case Wallet.Cardano.isDRepAlwaysNoConfidence(drep):
      return 'alwaysNoConfidence';
    case Wallet.Cardano.isDRepCredential(drep):
      return Wallet.Cardano.DRepID(drep.hash);
    default:
      throw new Error('incorrect drep supplied');
  }
};

export const certificateTransformer = (
  cardanoCoin: Wallet.CoinId,
  certificates?: TransactionCertificate[]
): TxDetails<TxDetailsCertificateTitles>[] =>
  // Currently only show enhanced certificate info for conway era certificates pending further discussion
  certificates
    ?.filter((certificate) =>
      Object.values(ConwayEraCertificatesTypes).includes(
        certificate.__typename as unknown as ConwayEraCertificatesTypes
      )
    )
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
          details: [
            `${Wallet.util.lovelacesToAdaString(conwayEraCertificate.deposit.toString())} ${cardanoCoin.symbol}`
          ]
        });
      }

      return transformedCertificate;
    });

export const votingProceduresTransformer = (
  votingProcedures: Wallet.Cardano.VotingProcedures
): TxDetails<TxDetailsVotingProceduresTitles>[] => {
  const votingProcedureDetails: TxDetails<TxDetailsVotingProceduresTitles>[] = [];

  votingProcedures?.forEach((procedure) =>
    procedure.votes.forEach((vote) => {
      const voterType = getVoterType(procedure.voter.__typename);
      const voterCredential =
        voterType === VoterTypeEnum.DREP
          ? Wallet.Cardano.DRepID(Wallet.HexBlob.toTypedBech32('drep', Wallet.HexBlob(procedure.voter.credential.hash)))
          : procedure.voter.credential.hash;
      const detail: TxDetails<TxDetailsVotingProceduresTitles> = [
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
        { title: 'proposalTxHash', details: [vote.actionId.id] },
        { title: 'actionIndex', details: [vote.actionId.actionIndex.toString()] }
      ];

      votingProcedureDetails.push(detail.filter((el: TxDetail<TxDetailsVotingProceduresTitles>) => !isEmpty(el)));
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
        case GovernanceActionType.parameter_change_action: {
          transformedProposal.push({
            title: 'protocolParamUpdate',
            details: Object.entries(protocolParamUpdate).map(
              ([parameter, proposedValue]) => `${parameter}: ${proposedValue.toString()}`
            )
          });
          break;
        }
        case GovernanceActionType.hard_fork_initiation_action: {
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
        case GovernanceActionType.treasury_withdrawals_action: {
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
        case GovernanceActionType.no_confidence: {
          if (actionId) {
            transformedProposal.push({
              title: 'governanceActionId',
              details: [actionId, actionIndex.toString()]
            });
          }
          break;
        }
        case GovernanceActionType.update_committee: {
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
        case GovernanceActionType.new_constitution: {
          transformedProposal.push({
            title: 'constitutionAnchor',
            details: [constitution.anchor.url, constitution.anchor.dataHash]
          });
        }
      }

      return transformedProposal;
    }
  );
