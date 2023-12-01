import { Wallet } from '@lace/cardano';
import { TxDirection, TxDirections } from '../types';
import BigNumber from 'bignumber.js';

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
    if ('address' in input && addresses.has(input.address)) {
      const resolvedInput = await resolveInput(input);

      if (resolvedInput) {
        total = total.plus(resolvedInput.value.coins.toString());
      }
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
  addresses: Wallet.KeyManagement.GroupedAddress[];
  fee: bigint;
  direction: TxDirection;
  resolveInput: Wallet.Cardano.ResolveInput;
}

export const getTransactionTotalAmount = async ({
  inputs,
  outputs,
  addresses,
  fee,
  direction,
  resolveInput
}: Args): Promise<BigNumber> => {
  const paymentAddresses = new Set(addresses.map((addr) => addr.address));
  const totalOutput = getTotalOutputAmount({ addresses: paymentAddresses, outputs });

  if (direction === TxDirections.Incoming) {
    return totalOutput;
  }

  const totalInput = await getTotalInputAmount({ addresses: paymentAddresses, inputs, resolveInput });

  return totalInput.minus(totalOutput).minus(fee.toString());
};
