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

export const useBalance = ({
  inMemoryWallet,
  minAdaRequired = minAdaRequiredSdk,
}: Readonly<Props>) => {
  const rewards = useObservable(inMemoryWallet.balance.rewardAccounts.rewards$);
  const total = useObservable(inMemoryWallet.balance.utxo.total$);
  const unspendable = useObservable(inMemoryWallet.balance.utxo.unspendable$);
  const addresses = useObservable(inMemoryWallet.addresses$);
  const protocolParameters = useObservable(inMemoryWallet.protocolParameters$);

  if (
    rewards === undefined ||
    total === undefined ||
    addresses === undefined ||
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
      address: addresses[0].address,
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
