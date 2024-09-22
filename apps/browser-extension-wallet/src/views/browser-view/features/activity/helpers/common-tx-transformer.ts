/* eslint-disable max-statements */
/* eslint-disable sonarjs/cognitive-complexity */
/* eslint-disable complexity */
import BigNumber from 'bignumber.js';
import { Wallet } from '@lace/cardano';
import { CurrencyInfo, TxDirections } from '@types';
import { inspectTxValues, inspectTxType, txIncludesConwayCertificates } from '@src/utils/tx-inspection';
import { formatDate, formatTime } from '@src/utils/format-date';
import { getTransactionTotalAmount } from '@src/utils/get-transaction-total-amount';
import type { TransformedActivity, TransformedTransactionActivity } from './types';
import { ActivityStatus, ConwayEraCertificatesTypes, DelegationActivityType } from '@lace/core';
import capitalize from 'lodash/capitalize';
import dayjs from 'dayjs';
import { hasPhase2ValidationFailed } from '@src/utils/phase2-validation';

const { util } = Wallet.Cardano;

export interface TxTransformerInput {
  tx: Wallet.TxInFlight | Wallet.Cardano.HydratedTx | Wallet.KeyManagement.WitnessedTx;
  walletAddresses: Wallet.KeyManagement.GroupedAddress[];
  fiatCurrency: CurrencyInfo;
  fiatPrice?: number;
  protocolParameters: Wallet.ProtocolParameters;
  cardanoCoin: Wallet.CoinId;
  date: Date;
  direction?: TxDirections;
  status?: Wallet.TransactionStatus;
  resolveInput: Wallet.Cardano.ResolveInput;
  isSharedWallet?: boolean;
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
    ? Wallet.util.convertLovelaceToFiat({ lovelaces: amount.toString(), fiat: fiatPrice }).toString()
    : '';
  return fiatAmount ? `${fiatAmount} ${fiatCurrency.code}` : '-';
};

const splitDelegationTx = (tx: TransformedActivity, hasConwayEraCerts: boolean): TransformedTransactionActivity[] => {
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
        type: hasConwayEraCerts
          ? ConwayEraCertificatesTypes.Registration
          : DelegationActivityType.delegationRegistration,
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
        type: hasConwayEraCerts
          ? ConwayEraCertificatesTypes.Unregistration
          : DelegationActivityType.delegationDeregistration,
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

const transformTransactionStatus = (
  tx: Wallet.TxInFlight | Wallet.Cardano.HydratedTx | Wallet.Cardano.Tx,
  status: Wallet.TransactionStatus
): ActivityStatus => {
  if (hasPhase2ValidationFailed(tx)) {
    return ActivityStatus.ERROR;
  }

  const statuses = {
    [Wallet.TransactionStatus.PENDING]: ActivityStatus.PENDING,
    [Wallet.TransactionStatus.ERROR]: ActivityStatus.ERROR,
    [Wallet.TransactionStatus.SUCCESS]: ActivityStatus.SUCCESS,
    [Wallet.TransactionStatus.SPENDABLE]: ActivityStatus.SPENDABLE,
    [Wallet.TransactionStatus.AWAITING_COSIGNATURES]: ActivityStatus.AWAITING_COSIGNATURES
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
  const transaction = 'tx' in tx ? tx.tx : tx;
  const { body } = transaction;
  if (hasPhase2ValidationFailed(transaction)) {
    return {
      amount: Wallet.util.getFormattedAmount({ amount: body.totalCollateral.toString(), cardanoCoin }),
      fiatAmount: getFormattedFiatAmount({
        amount: new BigNumber(body.totalCollateral?.toString() ?? '0'),
        fiatCurrency,
        fiatPrice
      })
    };
  }

  const outputAmount = await getTransactionTotalAmount({
    addresses: walletAddresses,
    inputs: body.inputs,
    outputs: body.outputs,
    fee: body.fee,
    direction,
    withdrawals: body.withdrawals,
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
  resolveInput,
  isSharedWallet
}: TxTransformerInput): Promise<TransformedTransactionActivity[]> => {
  const transaction = 'tx' in tx ? tx.tx : tx;
  const implicitCoin = util.computeImplicitCoin(protocolParameters, transaction.body);
  const deposit = implicitCoin.deposit ? Wallet.util.lovelacesToAdaString(implicitCoin.deposit.toString()) : undefined;
  const depositReclaimValue = Wallet.util.calculateDepositReclaim(implicitCoin);
  const depositReclaim = depositReclaimValue
    ? Wallet.util.lovelacesToAdaString(depositReclaimValue.toString())
    : undefined;
  const { assets } = await inspectTxValues({
    addresses: walletAddresses,
    tx: transaction as unknown as Wallet.Cardano.HydratedTx,
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
    id: transaction.id.toString(),
    deposit,
    depositReclaim,
    fee: Wallet.util.lovelacesToAdaString(transaction.body.fee.toString()),
    status: transformTransactionStatus(transaction, status),
    amount: formattedAmount.amount,
    fiatAmount: formattedAmount.fiatAmount,
    assets: assetsEntries,
    assetsNumber: (assets?.size ?? 0) + 1,
    date,
    formattedDate: [Wallet.TransactionStatus.PENDING, Wallet.TransactionStatus.AWAITING_COSIGNATURES].includes(status)
      ? capitalize(Wallet.TransactionStatus.PENDING)
      : formattedDate,
    formattedTimestamp
  };

  // Note that TxInFlight at type level does not expose its inputs with address,
  // which would prevent `inspectTxType` from determining whether tx is incoming or outgoing.
  // However at runtime, the "address" property is present (ATM) and the call below works.
  // SDK Ticket LW-8767 should fix the type of Input in TxInFlight to contain the address
  const type = await inspectTxType({
    walletAddresses,
    tx: transaction as unknown as Wallet.Cardano.HydratedTx,
    inputResolver: { resolveInput },
    isSharedWallet
  });

  if (type === DelegationActivityType.delegation) {
    return splitDelegationTx(baseTransformedActivity, txIncludesConwayCertificates(transaction.body.certificates));
  }

  return [
    {
      ...baseTransformedActivity,
      type,
      direction
    }
  ];
};

export interface CertificateMetadata {
  certificateType: Wallet.Cardano.CertificateType;
  poolId?: string;
  stakeKeyHash?: string;
  drepId?: string;
  alwaysAbstain?: boolean;
  alwaysNoConfidence?: boolean;
}
