/* eslint-disable complexity */
import BigNumber from 'bignumber.js';
import { Wallet } from '@lace/cardano';
import { CurrencyInfo, TxDirections } from '@types';
import { inspectTxValues, inspectTxType, getVoterType, getCredentialType, getVote } from '@src/utils/tx-inspection';
import { formatDate, formatTime } from '@src/utils/format-date';
import { getTransactionTotalAmount } from '@src/utils/get-transaction-total-amount';
import type { TransformedActivity, TransformedTransactionActivity } from './types';
import {
  ActivityStatus,
  DelegationActivityType,
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
import { drepIDasBech32FromHash } from '@src/features/dapp/components/confirm-transaction/utils';
import { PriceResult } from '@hooks';

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
        type: DelegationActivityType.delegation,
        // Deposit already shown in the delegationRegistration
        deposit: undefined
      },
      {
        ...tx,
        type: DelegationActivityType.delegationRegistration,
        // Let registration show just the deposit,
        // and the other transaction show fee to avoid duplicity
        fee: '0'
      }
    ];
  } else if (tx.depositReclaim) {
    return [
      {
        ...tx,
        type: DelegationActivityType.delegation,
        // Reclaimed deposit already shown in the delegationDeregistration
        depositReclaim: undefined
      },
      {
        ...tx,
        type: DelegationActivityType.delegationDeregistration,
        // Let de-registration show just the returned deposit,
        // and the other transaction show fee to avoid duplicity
        fee: '0'
      }
    ];
  }

  return [
    {
      ...tx,
      type: DelegationActivityType.delegation
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

  if (type === DelegationActivityType.delegation) {
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

const drepMapper = (drep: Wallet.Cardano.DelegateRepresentative) => {
  if (Wallet.Cardano.isDRepAlwaysAbstain(drep)) {
    return 'alwaysAbstain';
  } else if (Wallet.Cardano.isDRepAlwaysNoConfidence(drep)) {
    return 'alwaysNoConfidence';
  } else if (Wallet.Cardano.isDRepCredential(drep)) {
    return Wallet.Cardano.DRepID(drep.hash);
  }
  throw new Error('incorrect drep supplied');
};

export const certificateTransformer = (
  cardanoCoin: Wallet.CoinId,
  coinPrices: PriceResult,
  fiatCurrency: CurrencyInfo,
  certificates?: Wallet.Cardano.Certificate[]
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

      if ('coldCredential' in conwayEraCertificate) {
        transformedCertificate.push({
          title: 'coldCredential',
          details: [conwayEraCertificate.coldCredential.hash.toString()]
        });
      }

      if ('hotCredential' in conwayEraCertificate) {
        transformedCertificate.push({
          title: 'hotCredential',
          details: [conwayEraCertificate.hotCredential.hash.toString()]
        });
      }

      if ('stakeCredential' in conwayEraCertificate) {
        transformedCertificate.push({
          title: 'stakeKey',
          details: [conwayEraCertificate.stakeCredential.hash.toString()]
        });
      }

      if ('dRepCredential' in conwayEraCertificate) {
        transformedCertificate.push({
          title: 'drepId',
          details: [conwayEraCertificate.dRepCredential.hash.toString()]
        });
      }

      if ('anchor' in conwayEraCertificate && conwayEraCertificate.anchor) {
        transformedCertificate.push(
          {
            title: 'anchorUrl',
            details: [conwayEraCertificate.anchor.url]
          },
          {
            title: 'anchorHash',
            details: [conwayEraCertificate.anchor.dataHash.toString()]
          }
        );
      }

      if ('poolId' in conwayEraCertificate) {
        transformedCertificate.push({
          title: 'poolId',
          details: [conwayEraCertificate.poolId.toString()]
        });
      }

      if ('dRep' in conwayEraCertificate) {
        transformedCertificate.push({
          title: 'drep',
          details: [drepMapper(conwayEraCertificate.dRep)]
        });
      }

      if ('deposit' in conwayEraCertificate) {
        const depositPaidInAda = Wallet.util.lovelacesToAdaString(conwayEraCertificate.deposit.toString());
        transformedCertificate.push({
          title: 'depositPaid',
          info: 'depositPaidInfo',
          details: [
            [
              `${depositPaidInAda} ${cardanoCoin.symbol}`,
              `${Wallet.util.convertAdaToFiat({ ada: depositPaidInAda, fiat: coinPrices?.cardano?.price })} ${
                fiatCurrency?.code
              }`
            ]
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
      const detail: TxDetails<TxDetailsVotingProceduresTitles> = [];
      if (vote.votingProcedure.anchor) {
        detail.push(
          { title: 'anchorHash', details: [vote.votingProcedure.anchor.dataHash.toString()] },
          { title: 'anchorURL', details: [vote.votingProcedure.anchor.url] }
        );
      }

      detail.push(
        {
          title: 'voterType',
          details: [getVoterType(procedure.voter.__typename)]
        },
        {
          title: 'credentialType',
          details: [getCredentialType(procedure.voter.credential.type)]
        },
        { title: 'voteTypes', details: [getVote(vote.votingProcedure.vote)] }
      );

      votingProcedureDetails.push(detail.filter((el: TxDetail<TxDetailsVotingProceduresTitles>) => !isEmpty(el)));
    })
  );

  return votingProcedureDetails;
};

export const governanceProposalsTransformer = (
  cardanoCoin: Wallet.CoinId,
  proposalProcedures?: Wallet.Cardano.ProposalProcedure[]
): TxDetails<TxDetailsProposalProceduresTitles>[] =>
  proposalProcedures?.map((procedure) => {
    // Default details across all proposals
    const transformedProposal: TxDetails<TxDetailsProposalProceduresTitles> = [
      { title: 'type', details: [procedure.governanceAction.__typename] },
      {
        ...(procedure.governanceAction.__typename === GovernanceActionType.parameter_change_action && {
          title: 'deposit',
          details: [`${Wallet.util.lovelacesToAdaString(procedure.deposit.toString())} ${cardanoCoin.symbol}`]
        })
      },
      { title: 'anchorHash', details: [procedure.anchor.dataHash.toString()] },
      { title: 'anchorURL', details: [procedure.anchor.url] }
    ];

    if ('governanceActionId' in procedure.governanceAction) {
      transformedProposal.push({
        title: 'governanceActionIndex',
        details: [procedure.governanceAction.governanceActionId.actionIndex.toString()]
      });
    }

    if ('withdrawals' in procedure.governanceAction) {
      procedure.governanceAction.withdrawals.forEach(({ rewardAccount, coin }) => {
        transformedProposal.push({
          header: 'withdrawal',
          details: [
            {
              title: 'withdrawalRewardAccount',
              details: [rewardAccount]
            },
            {
              title: 'withdrawalAmount',
              details: [`${Wallet.util.lovelacesToAdaString(coin.toString())} ${cardanoCoin.symbol}`]
            }
          ]
        });
      });
    }

    if ('constitution' in procedure.governanceAction) {
      transformedProposal.push(
        {
          title: 'constitutionAnchorURL',
          details: [procedure.governanceAction.constitution.anchor.url]
        },
        {
          title: 'constitutionScriptHash',
          details: [procedure.governanceAction.constitution.scriptHash.toString()]
        }
      );
    }

    if ('membersToBeAdded' in procedure.governanceAction) {
      const membersToBeAdded: TxDetail<TxDetailsProposalProceduresTitles>[] = [];
      procedure.governanceAction.membersToBeAdded.forEach(({ coldCredential, epoch }) => {
        membersToBeAdded.push(
          {
            title: 'coldCredentialHash',
            details: [coldCredential.hash]
          },
          {
            title: 'epoch',
            details: [epoch.toString()]
          }
        );
      });

      if (membersToBeAdded.length > 0) {
        transformedProposal.push({
          header: 'membersToBeAdded',
          details: membersToBeAdded
        });
      }
    }

    if ('membersToBeRemoved' in procedure.governanceAction) {
      const membersToBeRemoved: TxDetail<TxDetailsProposalProceduresTitles>[] = [];
      procedure.governanceAction.membersToBeRemoved.forEach(({ hash }) => {
        membersToBeRemoved.push({
          title: 'hash',
          details: [hash.toString()]
        });
      });

      if (membersToBeRemoved.length > 0) {
        transformedProposal.push({
          header: 'membersToBeRemoved',
          details: membersToBeRemoved
        });
      }
    }

    if ('protocolVersion' in procedure.governanceAction) {
      transformedProposal.push(
        {
          title: 'protocolVersionMajor',
          details: [procedure.governanceAction.protocolVersion.major.toString()]
        },
        {
          title: 'protocolVersionMinor',
          details: [procedure.governanceAction.protocolVersion.minor.toString()]
        }
      );
      if (procedure.governanceAction.protocolVersion.patch) {
        transformedProposal.push({
          title: 'protocolVersionPatch',
          details: [procedure.governanceAction.protocolVersion.patch.toString()]
        });
      }
    }

    // Proposal-specific properties
    //   case GovernanceActionType.parameter_change_action: {
    //     transformedProposal.push({
    //       title: 'protocolParamUpdate',
    //       details: Object.entries(protocolParamUpdate).map(
    //         ([parameter, proposedValue]) => `${parameter}: ${proposedValue.toString()}`
    //       )
    //     });
    //     break;
    //   }

    return transformedProposal;
  });
