/* eslint-disable consistent-return */
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
    case 'incoming': {
      return TxDirections.Incoming;
    }
    case 'rewards': {
      return TxDirections.Outgoing;
    }
    case 'outgoing': {
      return TxDirections.Outgoing;
    }
    case 'self-rewards': {
      return TxDirections.Self;
    }
    case 'self': {
      return TxDirections.Self;
    }
  }
};

const selfTxInspector = (address: Wallet.Cardano.PaymentAddress) => (tx: Wallet.Cardano.HydratedTx) => {
  const notOwnInputs = tx.body.inputs.some((input) => input.address !== address);
  if (notOwnInputs) return false;
  const notOwnOutputs = tx.body.outputs.some((output) => output.address !== address);
  return !notOwnOutputs;
};

export const inspectTxType = ({
  walletAddresses,
  tx
}: {
  walletAddresses: {
    address: Wallet.Cardano.PaymentAddress;
    rewardAccount: Wallet.Cardano.RewardAccount;
  };
  tx: Wallet.Cardano.HydratedTx;
}): TransactionType | 'self-rewards' => {
  const inspectionProperties = createTxInspector({
    sent: sentInspector({ addresses: [walletAddresses.address], rewardAccounts: [walletAddresses.rewardAccount] }),
    totalWithdrawals: withdrawalInspector,
    delegation: delegationInspector,
    stakeKeyRegistration: stakeKeyRegistrationInspector,
    stakeKeyDeregistration: stakeKeyDeregistrationInspector,
    selfTransaction: selfTxInspector(walletAddresses.address)
  })(tx);

  const withRewardsWithdrawal =
    inspectionProperties.totalWithdrawals > BigInt(0) &&
    hasWalletStakeAddress(tx.body.withdrawals, walletAddresses.rewardAccount);

  if (inspectionProperties.sent.inputs.length > 0) {
    switch (true) {
      case !!inspectionProperties.delegation[0]?.poolId: {
        return 'delegation';
      }
      case inspectionProperties.stakeKeyRegistration.length > 0: {
        return 'delegationRegistration';
      }
      case inspectionProperties.stakeKeyDeregistration.length > 0: {
        return 'delegationDeregistration';
      }
      case withRewardsWithdrawal && inspectionProperties.selfTransaction: {
        return 'self-rewards';
      }
      case withRewardsWithdrawal: {
        return 'rewards';
      }
      case inspectionProperties.selfTransaction: {
        return 'self';
      }
      default: {
        return 'outgoing';
      }
    }
  }

  if (withRewardsWithdrawal) return 'rewards';
  return 'incoming';
};

export const inspectTxValues = ({
  address,
  tx,
  direction
}: {
  address: Wallet.Cardano.PaymentAddress;
  tx: Wallet.Cardano.HydratedTx;
  direction: TxDirection;
}): Wallet.Cardano.Value => {
  const addresses =
    direction === TxDirections.Outgoing
      ? tx.body.outputs.filter((item) => item.address !== address).map((item) => item.address)
      : [address];

  const inspectionProperties = createTxInspector({
    totalOutputsValue: totalAddressOutputsValueInspector(addresses)
  })(tx);

  return inspectionProperties.totalOutputsValue;
};
