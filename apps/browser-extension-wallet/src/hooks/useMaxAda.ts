import { useCallback, useEffect, useState } from 'react';
import { subtractValueQuantities } from '@cardano-sdk/core';
import { Wallet } from '@lace/cardano';
import { useWalletStore } from '@src/stores';
import { useObservable } from '@lace/common';
import { COIN_SELECTION_ERRORS } from './useInitializeTx';

const { getTotalMinimumCoins, setMissingCoins } = Wallet;

export const UTXO_DEPLETED_ADA_BUFFER = 1_000_000;

interface GetAdaErrorBuffer {
  inMemoryWallet: Wallet.ObservableWallet;
  address: Wallet.Cardano.PaymentAddress;
  maxAdaAmount: bigint;
}

const getAdaErrorBuffer = async ({ inMemoryWallet, address, maxAdaAmount }: GetAdaErrorBuffer): Promise<bigint> => {
  const isTxBuilt = async (adaAmount: bigint): Promise<boolean> => {
    try {
      const outputWithMaxAda = {
        address,
        value: {
          coins: adaAmount,
          assets: new Map()
        }
      };
      const txBuilder = inMemoryWallet.createTxBuilder();
      txBuilder.addOutput(outputWithMaxAda);
      await txBuilder.build().inspect();
      return true;
    } catch {
      return false;
    }
  };

  let adaErrorBuffer = BigInt(0);
  while (!(await isTxBuilt(maxAdaAmount - adaErrorBuffer))) {
    adaErrorBuffer += BigInt(UTXO_DEPLETED_ADA_BUFFER);
    if (adaErrorBuffer > maxAdaAmount) {
      throw new Error(COIN_SELECTION_ERRORS.FULLY_DEPLETED_ERROR);
    }
  }

  return adaErrorBuffer;
};

export const useMaxAda = (): bigint => {
  const [maxADA, setMaxADA] = useState<bigint>();
  const { walletInfo, inMemoryWallet } = useWalletStore();
  const balance = useObservable(inMemoryWallet?.balance?.utxo.available$);
  const availableRewards = useObservable(inMemoryWallet?.balance?.rewardAccounts?.rewards$);

  const calculateMaxAda = useCallback(async () => {
    if (!balance?.coins) {
      setMaxADA(BigInt(0));
      return;
    }

    const util = Wallet.createWalletUtil(inMemoryWallet);
    // create and output with only the wallet tokens and nfts so we can calculate the mising coins for feature txs
    const outputs = new Set([
      {
        address: walletInfo.addresses[0].address,
        value: {
          coins: BigInt(0),
          assets: balance.assets || new Map()
        }
      }
    ]);
    const minimumCoinQuantities = await util.validateOutputs(outputs);
    const totalMinimumCoins = getTotalMinimumCoins(minimumCoinQuantities);
    const props = setMissingCoins(minimumCoinQuantities, outputs);
    try {
      // build a tx get an approximate of the fee
      const tx = await inMemoryWallet.initializeTx(props);
      // substract the fee and the missing coins from the wallet balances
      const spendableBalance = subtractValueQuantities([
        { coins: balance.coins + BigInt(availableRewards || 0) }, // wallet balance
        { coins: BigInt(totalMinimumCoins.coinMissing) }, // this is the minimun coins needed for all the wallet tokens
        { coins: tx.inputSelection.fee } // this is an approximate fee
      ]);

      const errorBuffer = await getAdaErrorBuffer({
        inMemoryWallet,
        address: walletInfo.addresses[0].address,
        maxAdaAmount: spendableBalance.coins
      });

      setMaxADA(spendableBalance.coins - errorBuffer);
    } catch {
      setMaxADA(BigInt(0));
    }
  }, [inMemoryWallet, walletInfo.addresses, balance, availableRewards]);

  useEffect(() => {
    calculateMaxAda();
  }, [calculateMaxAda]);

  return maxADA;
};
