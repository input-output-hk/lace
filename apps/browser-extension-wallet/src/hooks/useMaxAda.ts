import { useCallback, useEffect, useState } from 'react';
import { subtractValueQuantities } from '@cardano-sdk/core';
import { Wallet } from '@lace/cardano';
import { useWalletStore } from '@src/stores';
import { useObservable } from '@lace/common';

const { getTotalMinimumCoins, setMissingCoins } = Wallet;

export const useMaxAda = (): bigint => {
  const [maxADA, setMaxADA] = useState<bigint>();
  const { walletInfo, inMemoryWallet } = useWalletStore();
  const balance = useObservable(inMemoryWallet?.balance?.utxo.available$);
  const availableRewards = useObservable(inMemoryWallet?.balance?.rewardAccounts?.rewards$);

  const calculateMaxAda = useCallback(async () => {
    if (!balance) {
      setMaxADA(BigInt(0));
      return;
    }

    if (balance.coins) {
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
          { coins: tx.inputSelection.fee }, // this is an approximate fee
          // eslint-disable-next-line no-magic-numbers
          { coins: BigInt(1_000_000) } // the wallet needs to have at least 1 utxo with 1000000 lovelaces/1 ADA
        ]);

        setMaxADA(spendableBalance.coins);
      } catch {
        setMaxADA(BigInt(0));
      }
    } else {
      setMaxADA(BigInt(0));
    }
  }, [inMemoryWallet, walletInfo.addresses, balance, availableRewards]);

  useEffect(() => {
    calculateMaxAda();
  }, [calculateMaxAda]);

  return maxADA;
};
