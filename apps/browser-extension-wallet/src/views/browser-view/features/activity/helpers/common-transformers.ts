import { AssetActivityItemProps } from '@lace/core';
import { inspectTxType } from '../../../../../utils/tx-inspection';

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
