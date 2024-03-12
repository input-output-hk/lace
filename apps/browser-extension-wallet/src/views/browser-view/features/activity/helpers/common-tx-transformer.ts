/* eslint-disable max-statements */
/* eslint-disable sonarjs/cognitive-complexity */
/* eslint-disable complexity */
import BigNumber from 'bignumber.js';
import { Wallet } from '@lace/cardano';
import { CurrencyInfo, TxDirections } from '@types';
import { inspectTxValues, inspectTxType, getVoterType, getVote } from '@src/utils/tx-inspection';
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
import { PriceResult } from '@hooks';
import { formatPercentages } from '@lace/common';
import { depositPaidWithSymbol } from '@src/features/dapp/components/confirm-transaction/utils';

const { util, GovernanceActionType, PlutusLanguageVersion, CertificateType, InputSource } = Wallet.Cardano;

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

const hasPhase2ValidationFailed = (tx: Wallet.TxInFlight | Wallet.Cardano.HydratedTx) =>
  'inputSource' in tx && tx.inputSource === InputSource.collaterals;

const transformTransactionStatus = (
  tx: Wallet.TxInFlight | Wallet.Cardano.HydratedTx,
  status: Wallet.TransactionStatus
): ActivityStatus => {
  if (hasPhase2ValidationFailed(tx)) {
    return ActivityStatus.ERROR;
  }

  const statuses = {
    [Wallet.TransactionStatus.PENDING]: ActivityStatus.PENDING,
    [Wallet.TransactionStatus.ERROR]: ActivityStatus.ERROR,
    [Wallet.TransactionStatus.SUCCESS]: ActivityStatus.SUCCESS,
    [Wallet.TransactionStatus.SPENDABLE]: ActivityStatus.SPENDABLE
  };
  return statuses[status];
};

type GetTxFormattedAmount = (
  args: Pick<
    TxTransformerInput,
    'walletAddresses' | 'tx' | 'direction' | 'resolveInput' | 'cardanoCoin' | 'fiatCurrency' | 'fiatPrice'
  >
) => Promise<{
  amount: string;
  fiatAmount: string;
}>;

const getTxFormattedAmount: GetTxFormattedAmount = async ({
  resolveInput,
  tx,
  walletAddresses,
  direction,
  cardanoCoin,
  fiatCurrency,
  fiatPrice
}) => {
  if (hasPhase2ValidationFailed(tx)) {
    return {
      amount: Wallet.util.getFormattedAmount({ amount: tx.body.totalCollateral.toString(), cardanoCoin }),
      fiatAmount: getFormattedFiatAmount({
        amount: new BigNumber(tx.body.totalCollateral?.toString() ?? '0'),
        fiatCurrency,
        fiatPrice
      })
    };
  }

  const outputAmount = await getTransactionTotalAmount({
    addresses: walletAddresses,
    inputs: tx.body.inputs,
    outputs: tx.body.outputs,
    fee: tx.body.fee,
    direction,
    withdrawals: tx.body.withdrawals,
    resolveInput
  });

  return {
    amount: Wallet.util.getFormattedAmount({ amount: outputAmount.toString(), cardanoCoin }),
    fiatAmount: getFormattedFiatAmount({ amount: outputAmount, fiatCurrency, fiatPrice })
  };
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
  const { assets } = await inspectTxValues({
    addresses: walletAddresses,
    tx: tx as unknown as Wallet.Cardano.HydratedTx,
    direction
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

  const formattedAmount = await getTxFormattedAmount({
    cardanoCoin,
    fiatCurrency,
    resolveInput,
    tx,
    walletAddresses,
    direction,
    fiatPrice
  });

  const baseTransformedActivity = {
    id: tx.id.toString(),
    deposit,
    depositReclaim,
    fee: Wallet.util.lovelacesToAdaString(tx.body.fee.toString()),
    status: transformTransactionStatus(tx, status),
    amount: formattedAmount.amount,
    fiatAmount: formattedAmount.fiatAmount,
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
  const type = await inspectTxType({
    walletAddresses,
    tx: tx as unknown as Wallet.Cardano.HydratedTx,
    inputResolver: { resolveInput }
  });

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
            title: 'anchorHash',
            details: [conwayEraCertificate.anchor.dataHash.toString()]
          },
          {
            title: 'anchorURL',
            details: [conwayEraCertificate.anchor.url]
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
        const depositTitle =
          conwayEraCertificate.__typename === CertificateType.UnregisterDelegateRepresentative
            ? 'depositReturned'
            : 'depositPaid';
        transformedCertificate.push({
          title: depositTitle,
          info: `${depositTitle}Info`,
          details: [
            [
              Wallet.util.getFormattedAmount({ amount: conwayEraCertificate.deposit.toString(), cardanoCoin }),
              `${Wallet.util.convertLovelaceToFiat({
                lovelaces: conwayEraCertificate.deposit.toString(),
                fiat: coinPrices?.cardano?.price
              })} ${fiatCurrency?.code}`
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
      const detail: TxDetails<TxDetailsVotingProceduresTitles> = [
        {
          title: 'voterType',
          details: [getVoterType(procedure.voter.__typename)]
        },
        {
          title: 'voterCredential',
          details: [procedure.voter.credential.hash.toString()]
        },
        { title: 'voteTypes', details: [getVote(vote.votingProcedure.vote)] }
      ];

      if (vote.votingProcedure.anchor) {
        detail.push(
          { title: 'anchorURL', details: [vote.votingProcedure.anchor.url] },
          { title: 'anchorHash', details: [vote.votingProcedure.anchor.dataHash.toString()] }
        );
      }

      votingProcedureDetails.push(detail.filter((el: TxDetail<TxDetailsVotingProceduresTitles>) => !isEmpty(el)));
    })
  );

  return votingProcedureDetails;
};

export const governanceProposalsTransformer = ({
  cardanoCoin,
  coinPrices,
  fiatCurrency,
  proposalProcedures
}: {
  cardanoCoin: Wallet.CoinId;
  coinPrices: PriceResult;
  fiatCurrency: CurrencyInfo;
  proposalProcedures?: Wallet.Cardano.ProposalProcedure[];
}): TxDetails<TxDetailsProposalProceduresTitles>[] =>
  proposalProcedures?.map((procedure) => {
    const transformedProposal: TxDetails<TxDetailsProposalProceduresTitles> = [
      { title: 'type', details: [procedure.governanceAction.__typename] },
      {
        ...(procedure.governanceAction.__typename === GovernanceActionType.parameter_change_action && {
          title: 'deposit',
          info: 'deposit',
          details: [
            [
              Wallet.util.getFormattedAmount({ amount: procedure.deposit.toString(), cardanoCoin }),
              `${Wallet.util.convertLovelaceToFiat({
                lovelaces: procedure.deposit.toString(),
                fiat: coinPrices?.cardano?.price
              })} ${fiatCurrency?.code}`
            ]
          ]
        })
      },
      { title: 'rewardAccount', details: [procedure.anchor.dataHash.toString()] },
      { title: 'anchorURL', details: [procedure.anchor.url] },
      { title: 'anchorHash', details: [procedure.anchor.dataHash.toString()] }
    ];

    if ('governanceActionId' in procedure.governanceAction && procedure.governanceAction.governanceActionId) {
      transformedProposal.push(
        {
          title: 'governanceActionID',
          details: [procedure.governanceAction.governanceActionId.id.toString()]
        },
        {
          title: 'actionIndex',
          details: [procedure.governanceAction.governanceActionId.actionIndex.toString()]
        }
      );
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
              details: [
                Wallet.util.getFormattedAmount({
                  amount: coin.toString(),
                  cardanoCoin
                })
              ]
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

    if ('newQuorumThreshold' in procedure.governanceAction) {
      transformedProposal.push({
        title: 'newQuorumThreshold',
        details: [
          `${formatPercentages(
            procedure.governanceAction.newQuorumThreshold.numerator /
              procedure.governanceAction.newQuorumThreshold.denominator
          )}%`
        ]
      });
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

    if (procedure.governanceAction.__typename === GovernanceActionType.parameter_change_action) {
      const {
        protocolParamUpdate: {
          maxExecutionUnitsPerTransaction,
          maxExecutionUnitsPerBlock,
          maxBlockBodySize,
          maxTxSize,
          maxBlockHeaderSize,
          maxValueSize,
          maxCollateralInputs,
          minFeeCoefficient,
          minFeeConstant,
          stakeKeyDeposit,
          poolDeposit,
          monetaryExpansion,
          treasuryExpansion,
          minPoolCost,
          coinsPerUtxoByte,
          poolInfluence,
          poolRetirementEpochBound,
          desiredNumberOfPools,
          collateralPercentage,
          costModels,
          governanceActionValidityPeriod,
          governanceActionDeposit,
          dRepDeposit,
          dRepInactivityPeriod,
          minCommitteeSize,
          committeeTermLimit,
          dRepVotingThresholds,
          prices
        }
      } = procedure.governanceAction;
      transformedProposal.push(
        {
          header: 'maxTxExUnits',
          details: [
            {
              title: 'memory',
              details: [maxExecutionUnitsPerTransaction.memory.toString()]
            },
            {
              title: 'step',
              details: [maxExecutionUnitsPerTransaction.steps.toString()]
            }
          ]
        },
        {
          header: 'maxBlockExUnits',
          details: [
            {
              title: 'memory',
              details: [maxExecutionUnitsPerBlock.memory.toString()]
            },
            {
              title: 'step',
              details: [maxExecutionUnitsPerBlock.steps.toString()]
            }
          ]
        },
        {
          header: 'networkGroup',
          details: [
            {
              title: 'maxBBSize',
              details: [maxBlockBodySize?.toString()]
            },
            {
              title: 'maxTxSize',
              details: [maxTxSize?.toString()]
            },
            {
              title: 'maxBHSize',
              details: [maxBlockHeaderSize?.toString()]
            },
            {
              title: 'maxValSize',
              details: [maxValueSize?.toString()]
            },
            {
              title: 'maxCollateralInputs',
              details: [maxCollateralInputs?.toString()]
            }
          ]
        },
        {
          header: 'economicGroup',
          details: [
            {
              title: 'minFeeA',
              details: [minFeeCoefficient?.toString()]
            },
            {
              title: 'minFeeB',
              details: [minFeeConstant?.toString()]
            },
            {
              title: 'keyDeposit',
              details: [stakeKeyDeposit?.toString()]
            },
            {
              title: 'poolDeposit',
              details: [poolDeposit?.toString()]
            },
            {
              title: 'rho',
              details: [monetaryExpansion?.toString()]
            },
            {
              title: 'tau',
              details: [treasuryExpansion?.toString()]
            },
            {
              title: 'minPoolCost',
              details: [minPoolCost?.toString()]
            },
            {
              title: 'coinsPerUTxOByte',
              details: [coinsPerUtxoByte?.toString()]
            }
          ]
        },
        {
          header: 'costModels',
          details: [
            {
              title: 'PlutusV1',
              details: costModels.get(PlutusLanguageVersion.V1).map((model) => model.toString())
            },
            {
              title: 'PlutusV2',
              details: costModels.get(PlutusLanguageVersion.V2).map((model) => model.toString())
            }
          ]
        },
        {
          header: 'technicalGroup',
          details: [
            {
              title: 'a0',
              details: [poolInfluence?.toString()]
            },
            {
              title: 'eMax',
              details: [poolRetirementEpochBound?.toString()]
            },
            {
              title: 'nOpt',
              details: [desiredNumberOfPools?.toString()]
            },
            {
              title: 'collateralPercentage',
              details: [collateralPercentage?.toString()]
            }
          ]
        },
        {
          header: 'prices',
          details: [
            {
              title: 'memory',
              details: [prices.memory.toString()]
            },
            {
              title: 'step',
              details: [prices.steps.toString()]
            }
          ]
        },
        {
          header: 'governanceGroup',
          details: [
            {
              title: 'govActionLifetime',
              details: [governanceActionValidityPeriod?.toString()]
            },
            {
              title: 'govActionDeposit',
              details: [depositPaidWithSymbol(BigInt(governanceActionDeposit), cardanoCoin)]
            },
            {
              title: 'drepDeposit',
              details: [depositPaidWithSymbol(BigInt(dRepDeposit), cardanoCoin)]
            },
            {
              title: 'drepActivity',
              details: [dRepInactivityPeriod?.toString()]
            },
            {
              title: 'ccMinSize',
              details: [minCommitteeSize?.toString()]
            },
            {
              title: 'ccMaxTermLength',
              details: [committeeTermLimit?.toString()]
            }
          ]
        }
      );

      if (dRepVotingThresholds) {
        const {
          motionNoConfidence,
          committeeNormal,
          commiteeNoConfidence,
          hardForkInitiation,
          ppNetworkGroup,
          ppEconomicGroup,
          ppTechnicalGroup,
          ppGovernanceGroup,
          treasuryWithdrawal,
          updateConstitution
        } = dRepVotingThresholds;
        transformedProposal.push({
          header: 'dRepVotingThresholds',
          details: [
            {
              title: 'motionNoConfidence',
              details: [`${formatPercentages(motionNoConfidence.numerator / motionNoConfidence.denominator)}%`]
            },
            {
              title: 'committeeNormal',
              details: [`${formatPercentages(committeeNormal.numerator / committeeNormal.denominator)}%`]
            },
            {
              title: 'committeeNoConfidence',
              details: [`${formatPercentages(commiteeNoConfidence.numerator / commiteeNoConfidence.denominator)}%`]
            },
            {
              title: 'updateConstitution',
              details: [`${formatPercentages(updateConstitution.numerator / updateConstitution.denominator)}%`]
            },
            {
              title: 'hardForkInitiation',
              details: [`${formatPercentages(hardForkInitiation.numerator / hardForkInitiation.denominator)}%`]
            },
            {
              title: 'ppNetworkGroup',
              details: [`${formatPercentages(ppNetworkGroup.numerator / ppNetworkGroup.denominator)}%`]
            },
            {
              title: 'ppEconomicGroup',
              details: [`${formatPercentages(ppEconomicGroup.numerator / ppEconomicGroup.denominator)}%`]
            },
            {
              title: 'ppTechnicalGroup',
              details: [`${formatPercentages(ppTechnicalGroup.numerator / ppTechnicalGroup.denominator)}%`]
            },
            {
              title: 'ppGovernanceGroup',
              details: [`${formatPercentages(ppGovernanceGroup.numerator / ppGovernanceGroup.denominator)}%`]
            },
            {
              title: 'treasuryWithdrawal',
              details: [`${formatPercentages(treasuryWithdrawal.numerator / treasuryWithdrawal.denominator)}%`]
            }
          ]
        });
      }
    }

    return transformedProposal;
  });
