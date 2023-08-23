import { AssetActivityItemProps } from '@lace/core';
import { inspectTxType } from '../../../../../utils/tx-inspection';

type TransformedTx = Omit<AssetActivityItemProps, 'onClick'>;

export const splitDelegationWithDeregistrationIntoTwoActions = (tx: TransformedTx): [TransformedTx, TransformedTx] => [
  {
    ...tx,
    type: 'delegationDeregistration',
    // Let de-registration show just the returned deposit,
    // and the other transaction show fee to avoid duplicity
    fee: '0'
  },
  {
    ...tx,
    type: 'delegation',
    // Deposit already shown in the delegationDeregistration
    returnedDeposit: undefined
  }
];

// If a delegation transaction has also any returned deposit (deregistration certificates),
// we want to split it into two separate actions for clarity
export const isDelegationWithDeregistrationTx = (tx: TransformedTx, type: ReturnType<typeof inspectTxType>): boolean =>
  type === 'delegation' && !!tx.returnedDeposit;
