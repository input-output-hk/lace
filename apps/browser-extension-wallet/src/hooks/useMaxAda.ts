/* eslint-disable no-magic-numbers */
import { useEffect, useState } from 'react';
import { subtractValueQuantities } from '@cardano-sdk/core';
import { Wallet } from '@lace/cardano';
import { useWalletStore } from '@src/stores';
import { useObservable } from '@lace/common';
import { COIN_SELECTION_ERRORS } from './useInitializeTx';
import { OutputsMap, useTransactionProps } from '@src/views/browser-view/features/send-transaction';
import { TxBuilder } from '@cardano-sdk/tx-construction';
import { Assets, WalletUtil } from '@cardano-sdk/wallet';

const { getTotalMinimumCoins, setMissingCoins } = Wallet;

export const UTXO_DEPLETED_ADA_BUFFER = 1_000_000;
export const ADA_BUFFER_LIMIT = UTXO_DEPLETED_ADA_BUFFER * 10;

interface CreateTestOutputs {
  address: Wallet.Cardano.PaymentAddress;
  adaAmount: bigint;
  outputMap?: OutputsMap;
  assetInfo: Assets;
  validateOutput: WalletUtil['validateOutput'];
}

const createTestOutputs = async ({
  address,
  adaAmount,
  assetInfo,
  outputMap = new Map(),
  validateOutput
}: CreateTestOutputs) => {
  const outputs: Wallet.Cardano.TxOut[] = [
    {
      address,
      value: {
        coins: adaAmount
      }
    }
  ];

  for (const [, output] of outputMap) {
    if (output.value.assets) {
      const assets = Wallet.convertAssetsToBigInt(output.value.assets, assetInfo);
      const txOut = {
        address: output.address,
        value: {
          coins: BigInt(0),
          assets
        }
      };
      const minimumCoinQuantities = await validateOutput(txOut);
      outputs.push({
        address: txOut.address,
        value: {
          ...txOut.value,
          coins: BigInt(minimumCoinQuantities.minimumCoin)
        }
      });
    }
  }

  return outputs;
};

interface IsTransactionBuildable {
  outputs: Wallet.Cardano.TxOut[];
  txBuilder: TxBuilder;
}

const isTransactionBuildable = async ({ outputs, txBuilder }: IsTransactionBuildable): Promise<boolean> => {
  try {
    outputs.forEach((output) => txBuilder.addOutput(output));
    await txBuilder.build().inspect();
    return true;
  } catch {
    return false;
  } finally {
    outputs.forEach((output) => txBuilder.removeOutput(output));
  }
};

interface GetAdaErrorBuffer {
  txBuilder: TxBuilder;
  address: Wallet.Cardano.PaymentAddress;
  maxAdaAmount: bigint;
  assetInfo: Assets;
  outputMap?: OutputsMap;
  signal: AbortSignal;
  validateOutput: WalletUtil['validateOutput'];
}

const getAdaErrorBuffer = async ({
  txBuilder,
  address,
  outputMap,
  maxAdaAmount,
  assetInfo,
  signal,
  validateOutput,
  adaErrorBuffer = BigInt(0)
}: GetAdaErrorBuffer & { adaErrorBuffer?: bigint }): Promise<bigint> => {
  if (signal.aborted) {
    throw new Error('Aborted');
  }
  if (adaErrorBuffer > maxAdaAmount || adaErrorBuffer > ADA_BUFFER_LIMIT) {
    throw new Error(COIN_SELECTION_ERRORS.FULLY_DEPLETED_ERROR);
  }

  const adaAmount = maxAdaAmount - adaErrorBuffer;
  const outputs = await createTestOutputs({
    address,
    adaAmount,
    assetInfo,
    outputMap,
    validateOutput
  });
  const canBuildTx = await isTransactionBuildable({ outputs, txBuilder });

  if (canBuildTx) {
    return adaErrorBuffer;
  }

  return getAdaErrorBuffer({
    txBuilder,
    validateOutput,
    address,
    outputMap,
    maxAdaAmount,
    assetInfo,
    signal,
    adaErrorBuffer: adaErrorBuffer + BigInt(UTXO_DEPLETED_ADA_BUFFER)
  });
};

interface CalculateMaxAda {
  inMemoryWallet: Wallet.ObservableWallet;
  address: Wallet.Cardano.PaymentAddress;
  balance: Wallet.Cardano.Value;
  availableRewards: bigint;
  assetInfo: Assets;
  signal: AbortSignal;
  outputMap: OutputsMap;
}

const calculateMaxAda = async ({
  balance,
  inMemoryWallet,
  address,
  availableRewards,
  outputMap,
  assetInfo,
  signal
}: CalculateMaxAda) => {
  if (!balance?.coins || !address) {
    return BigInt(0);
  }
  const txBuilder = inMemoryWallet.createTxBuilder();
  const { validateOutput, validateOutputs } = Wallet.createWalletUtil(inMemoryWallet);
  // create and output with only the wallet tokens and nfts so we can calculate the mising coins for feature txs
  const outputs = new Set([
    {
      address,
      value: {
        coins: BigInt(0),
        assets: balance.assets || new Map()
      }
    }
  ]);
  const minimumCoinQuantities = await validateOutputs(outputs);
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
      address,
      txBuilder,
      maxAdaAmount: spendableBalance.coins,
      assetInfo,
      outputMap,
      validateOutput,
      signal
    });

    return spendableBalance.coins - errorBuffer;
  } catch {
    return BigInt(0);
  }
};

export const useMaxAda = (): bigint => {
  const [maxADA, setMaxADA] = useState<bigint>();
  const { walletInfo, inMemoryWallet } = useWalletStore();
  const balance = useObservable(inMemoryWallet?.balance?.utxo.available$);
  const availableRewards = useObservable(inMemoryWallet?.balance?.rewardAccounts?.rewards$);
  const assetInfo = useObservable(inMemoryWallet?.assetInfo$);
  const { outputMap } = useTransactionProps();
  const address = walletInfo.addresses[0].address;

  useEffect(() => {
    const abortController = new AbortController();
    const calculate = async () => {
      const result = await calculateMaxAda({
        address,
        availableRewards,
        balance,
        assetInfo,
        inMemoryWallet,
        signal: abortController.signal,
        outputMap
      });

      if (!abortController.signal.aborted) {
        setMaxADA(result);
      }
    };

    calculate();
    return () => {
      abortController.abort();
    };
  }, [availableRewards, assetInfo, balance, inMemoryWallet, address, outputMap]);

  return maxADA;
};
