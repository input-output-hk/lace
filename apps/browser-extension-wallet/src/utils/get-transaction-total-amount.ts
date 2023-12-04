import { Wallet } from '@lace/cardano';
import { TxDirection, TxDirections } from '../types';
import BigNumber from 'bignumber.js';

interface GetTotalWithdrawlAmountArgs {
  stakeAddresses: Set<Wallet.Cardano.RewardAccount>;
  withdrawals?: Wallet.Cardano.Withdrawal[];
}

const getTotalWithdrawlAmount = ({ stakeAddresses, withdrawals = [] }: GetTotalWithdrawlAmountArgs): BigNumber => {
  let total = new BigNumber(0);

  for (const withdrawal of withdrawals) {
    if (stakeAddresses.has(withdrawal.stakeAddress)) {
      total = total.plus(withdrawal.quantity.toString());
    }
  }

  return total;
};

interface GetTotalInputAmountArgs {
  inputs: Wallet.Cardano.TxIn[] | Wallet.Cardano.HydratedTxIn[];
  addresses: Set<Wallet.Cardano.PaymentAddress>;
  resolveInput: Wallet.Cardano.ResolveInput;
}

const getTotalInputAmount = async ({
  inputs,
  addresses,
  resolveInput
}: GetTotalInputAmountArgs): Promise<BigNumber> => {
  let total = new BigNumber(0);
  for (const input of inputs) {
    const resolvedInput = await resolveInput(input);
    if (resolvedInput && addresses.has(resolvedInput.address)) {
      total = total.plus(resolvedInput.value.coins.toString());
    }
  }

  return total;
};

interface GetTotalOutputAmountArgs {
  outputs: Wallet.Cardano.TxOut[];
  addresses: Set<Wallet.Cardano.PaymentAddress>;
}

const getTotalOutputAmount = ({ outputs, addresses }: GetTotalOutputAmountArgs): BigNumber => {
  let total = new BigNumber(0);

  for (const output of outputs) {
    if (addresses.has(output.address)) {
      total = total.plus(output.value.coins.toString());
    }
  }

  return total;
};

interface Args {
  inputs: Wallet.Cardano.TxIn[] | Wallet.Cardano.HydratedTxIn[];
  outputs: Wallet.Cardano.TxOut[];
  withdrawals?: Wallet.Cardano.Withdrawal[];
  addresses: Wallet.KeyManagement.GroupedAddress[];
  fee: bigint;
  direction: TxDirection;
  resolveInput: Wallet.Cardano.ResolveInput;
}

export const getTransactionTotalAmount = async ({
  inputs,
  outputs,
  withdrawals,
  addresses,
  fee,
  direction,
  resolveInput
}: Args): Promise<BigNumber> => {
  const paymentAddresses = new Set(addresses.map((addr) => addr.address));
  const stakeAddresses = new Set(addresses.map((addr) => addr.rewardAccount));
  const totalOutput = getTotalOutputAmount({ addresses: paymentAddresses, outputs });
  const totalWithdrawals = getTotalWithdrawlAmount({ stakeAddresses, withdrawals });

  if (direction === TxDirections.Incoming) {
    return totalOutput;
  }

  const totalInput = await getTotalInputAmount({
    addresses: paymentAddresses,
    inputs,
    resolveInput
  });

  return totalInput.plus(totalWithdrawals).minus(totalOutput).absoluteValue().minus(fee.toString());
};
