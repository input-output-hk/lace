import { minAdaRequired as minAdaRequiredSdk } from '@cardano-sdk/tx-construction';
import { useObservable } from '@lace/common';

import type { Wallet } from '@lace/cardano';

interface Props {
  inMemoryWallet: Wallet.ObservableWallet;
  minAdaRequired?: (
    output: Readonly<Wallet.Cardano.TxOut>,
    coinsPerUtxoByte: bigint,
  ) => bigint;
}

interface GetBalance {
  rewards?: bigint;
  total?: Wallet.Cardano.Value;
  address?: Wallet.Cardano.PaymentAddress;
  unspendable?: Wallet.Cardano.Value;
  protocolParameters?: Wallet.Cardano.ProtocolParameters;
  minAdaRequired?: (
    output: Readonly<Wallet.Cardano.TxOut>,
    coinsPerUtxoByte: bigint,
  ) => bigint;
}

export const getBalance = ({
  rewards,
  address,
  protocolParameters,
  total,
  unspendable,
  minAdaRequired = minAdaRequiredSdk,
}: Readonly<GetBalance>) => {
  if (
    rewards === undefined ||
    total === undefined ||
    address === undefined ||
    unspendable === undefined ||
    protocolParameters === undefined
  ) {
    return {
      totalCoins: BigInt(0),
      unspendableCoins: BigInt(0),
      lockedCoins: BigInt(0),
    };
  }

  if (!total.assets || total.assets?.size === 0) {
    return {
      totalCoins: total.coins + rewards,
      unspendableCoins: unspendable.coins,
      lockedCoins: BigInt(0),
    };
  } else {
    const outputs = {
      address,
      value: {
        coins: BigInt(0),
        assets: total.assets ?? new Map(),
      },
    };

    return {
      totalCoins: total.coins + rewards,
      unspendableCoins: unspendable.coins,
      lockedCoins: minAdaRequired(
        outputs,
        BigInt(protocolParameters.coinsPerUtxoByte),
      ),
    };
  }
};

export const useBalance = ({
  inMemoryWallet,
  minAdaRequired = minAdaRequiredSdk,
}: Readonly<Props>) => {
  const rewards = useObservable(inMemoryWallet.balance.rewardAccounts.rewards$);
  const total = useObservable(inMemoryWallet.balance.utxo.total$);
  const unspendable = useObservable(inMemoryWallet.balance.utxo.unspendable$);
  const addresses = useObservable(inMemoryWallet.addresses$);
  const protocolParameters = useObservable(inMemoryWallet.protocolParameters$);

  return getBalance({
    address: addresses?.[0]?.address,
    minAdaRequired,
    protocolParameters,
    rewards,
    total,
    unspendable,
  });
};
