/* eslint-disable consistent-return, unicorn/no-array-reduce */
import {
  createTxInspector,
  delegationInspector,
  stakeKeyDeregistrationInspector,
  stakeKeyRegistrationInspector,
  withdrawalInspector,
  sentInspector,
  totalAddressOutputsValueInspector
} from '@cardano-sdk/core';
import { Wallet } from '@lace/cardano';
import { TransactionType } from '@lace/core';
import { TxDirection, TxDirections } from '@src/types';

const hasWalletStakeAddress = (
  withdrawals: Wallet.Cardano.HydratedTx['body']['withdrawals'],
  stakeAddress: Wallet.Cardano.RewardAccount
) => withdrawals.some((item) => item.stakeAddress === stakeAddress);

interface TxTypeProps {
  type: TransactionType | 'self-rewards';
}

export const getTxDirection = ({ type }: TxTypeProps): TxDirection => {
  switch (type) {
    case 'incoming':
      return TxDirections.Incoming;
    case 'rewards':
      return TxDirections.Outgoing;
    case 'outgoing':
      return TxDirections.Outgoing;
    case 'self-rewards':
      return TxDirections.Self;
    case 'self':
      return TxDirections.Self;
  }
};

const selfTxInspector = (addresses: Wallet.Cardano.PaymentAddress[]) => (tx: Wallet.Cardano.HydratedTx) => {
  const notOwnInputs = tx.body.inputs.some((input) => !addresses.includes(input.address));
  if (notOwnInputs) return false;
  const notOwnOutputs = tx.body.outputs.some((output) => !addresses.includes(output.address));
  return !notOwnOutputs;
};

export const inspectTxType = ({
  walletAddresses,
  tx
}: {
  walletAddresses: Wallet.KeyManagement.GroupedAddress[];
  tx: Wallet.Cardano.HydratedTx;
}): TransactionType | 'self-rewards' => {
  const { paymentAddresses, rewardAccounts } = walletAddresses.reduce(
    (acc, curr) => ({
      paymentAddresses: [...acc.paymentAddresses, curr.address],
      rewardAccounts: [...acc.rewardAccounts, curr.rewardAccount]
    }),
    { paymentAddresses: [], rewardAccounts: [] }
  );

  const inspectionProperties = createTxInspector({
    sent: sentInspector({
      addresses: paymentAddresses,
      rewardAccounts
    }),
    totalWithdrawals: withdrawalInspector,
    delegation: delegationInspector,
    stakeKeyRegistration: stakeKeyRegistrationInspector,
    stakeKeyDeregistration: stakeKeyDeregistrationInspector,
    selfTransaction: selfTxInspector(paymentAddresses)
  })(tx);

  const withRewardsWithdrawal =
    inspectionProperties.totalWithdrawals > BigInt(0) &&
    walletAddresses.some((addr) => hasWalletStakeAddress(tx.body.withdrawals, addr.rewardAccount));

  if (inspectionProperties.sent.inputs.length > 0) {
    switch (true) {
      case !!inspectionProperties.delegation[0]?.poolId:
        return 'delegation';
      case inspectionProperties.stakeKeyRegistration.length > 0:
        return 'delegationRegistration';
      case inspectionProperties.stakeKeyDeregistration.length > 0:
        return 'delegationDeregistration';
      case withRewardsWithdrawal && inspectionProperties.selfTransaction:
        return 'self-rewards';
      case withRewardsWithdrawal:
        return 'rewards';
      case inspectionProperties.selfTransaction:
        return 'self';
      default:
        return 'outgoing';
    }
  }

  if (withRewardsWithdrawal) return 'rewards';
  return 'incoming';
};

export const inspectTxValues = ({
  addresses,
  tx,
  direction
}: {
  addresses: Wallet.KeyManagement.GroupedAddress[];
  tx: Wallet.Cardano.HydratedTx;
  direction: TxDirection;
}): Wallet.Cardano.Value => {
  const paymentAddresses = addresses.map((addr) => addr.address);

  const targetAddresses =
    direction === TxDirections.Outgoing
      ? tx.body.outputs.filter((item) => !paymentAddresses.includes(item.address)).map((item) => item.address)
      : paymentAddresses;

  const inspectionProperties = createTxInspector({
    totalOutputsValue: totalAddressOutputsValueInspector(targetAddresses)
  })(tx);

  return inspectionProperties.totalOutputsValue;
};
