/* eslint-disable no-magic-numbers */
import { useEffect, useState } from 'react';
import { Wallet } from '@lace/cardano';
import { useWalletStore } from '@src/stores';
import { useObservable } from '@lace/common';
import { OutputsMap, useMaxAdaStatus, useTransactionProps } from '@src/views/browser-view/features/send-transaction';
import { TxBuilder } from '@cardano-sdk/tx-construction';
import { Assets, WalletUtil } from '@cardano-sdk/wallet';
import pDebounce from 'p-debounce';
import { subtractValueQuantities } from '@cardano-sdk/core';

const { getTotalMinimumCoins, setMissingCoins } = Wallet;

export const UTXO_DEPLETED_ADA_BUFFER = 1_000_000;
export const ADA_BUFFER_LIMIT = UTXO_DEPLETED_ADA_BUFFER * 10;

interface GetCoinsForTokens {
  address: Wallet.Cardano.PaymentAddress;
  balance: Wallet.Cardano.Value;
  txBuilder: TxBuilder;
  validateOutputs: WalletUtil['validateOutputs'];
  validateOutput: WalletUtil['validateOutput'];
}

interface SplitOutput {
  address: Wallet.Cardano.PaymentAddress;
  output: Wallet.Cardano.TxOut;
  outputs: Set<Wallet.Cardano.TxOut>;
  validateOutput: WalletUtil['validateOutput'];
}

const createOutput = (
  address: Wallet.Cardano.PaymentAddress,
  assets: Wallet.Cardano.TokenMap
): Wallet.Cardano.TxOut => ({
  address,
  value: {
    coins: BigInt(0),
    assets
  }
});

const splitOutput = async ({ address, output, outputs, validateOutput }: SplitOutput) => {
  const assets = output.value.assets;
  const assetEntries = [...assets.entries()];
  const midpoint = Math.ceil(assetEntries.length / 2);
  const assets1 = new Map(assetEntries.slice(0, midpoint));
  const assets2 = new Map(assetEntries.slice(midpoint));

  const output1 = createOutput(address, assets1);
  const output2 = createOutput(address, assets2);

  const validation1 = await validateOutput(output1);
  const validation2 = await validateOutput(output2);

  if (validation1.tokenBundleSizeExceedsLimit) {
    await splitOutput({ address, output: output1, outputs, validateOutput });
  } else {
    outputs.add(output1);
  }

  if (validation2.tokenBundleSizeExceedsLimit) {
    await splitOutput({ address, output: output2, outputs, validateOutput });
  } else {
    outputs.add(output2);
  }
};

const distributeAssetsInMinOutputs = async (
  address: Wallet.Cardano.PaymentAddress,
  balance: Wallet.Cardano.Value,
  validateOutput: WalletUtil['validateOutput']
) => {
  const outputs = new Set<Wallet.Cardano.TxOut>();
  const initialOutput = createOutput(address, balance.assets || new Map());
  const initialValidation = await validateOutput(initialOutput);

  if (initialValidation.tokenBundleSizeExceedsLimit) {
    await splitOutput({ address, output: initialOutput, outputs, validateOutput });
  } else {
    outputs.add(initialOutput);
  }

  return new Set(
    [...outputs].map((output) => {
      output.value.coins = BigInt(0);
      return output;
    })
  );
};

const getMinimumCoinsAndFee = async ({
  address,
  balance,
  txBuilder,
  validateOutputs,
  validateOutput
}: GetCoinsForTokens) => {
  const outputs = await distributeAssetsInMinOutputs(address, balance, validateOutput);

  const minimumCoinQuantities = await validateOutputs(outputs);
  const props = setMissingCoins(minimumCoinQuantities, outputs);
  const totalMinimumCoins = getTotalMinimumCoins(minimumCoinQuantities);
  props.outputs.forEach((output) => {
    txBuilder.addOutput(output);
  });
  const tx = await txBuilder.build().inspect();
  props.outputs.forEach((output) => txBuilder.removeOutput(output));

  return { fee: tx.inputSelection.fee, minimumCoins: balance.assets ? totalMinimumCoins.coinMissing : BigInt(0) };
};

interface CreateTestOutputs {
  address: Wallet.Cardano.PaymentAddress;
  adaAmount: bigint;
  outputMap?: OutputsMap;
  assetInfo: Assets;
  validateOutputs: WalletUtil['validateOutputs'];
}

const createOutputsWithMaxAmount = async ({
  address,
  adaAmount,
  assetInfo,
  outputMap = new Map(),
  validateOutputs
}: CreateTestOutputs) => {
  if (outputMap.size < 2) {
    return new Set<Wallet.Cardano.TxOut>([
      {
        address,
        value: {
          coins: adaAmount
        }
      }
    ]);
  }

  const outputSet = [...outputMap].reduce((acc, [, output]) => {
    if (output.value.assets) {
      const assets = Wallet.convertAssetsToBigInt(output.value.assets, assetInfo);
      acc.add({
        address: output.address || address,
        value: {
          coins: BigInt(0),
          assets
        }
      });
    } else {
      acc.add({
        address: output.address || address,
        value: {
          coins: BigInt(0)
        }
      });
    }
    return acc;
  }, new Set<Wallet.Cardano.TxOut>());

  const { outputs: outputsWithMissingCoins } = setMissingCoins(await validateOutputs(outputSet), outputSet);
  const [firstOutput] = outputsWithMissingCoins;
  firstOutput.value.coins = adaAmount;
  return outputsWithMissingCoins;
};

interface IsTransactionBuildable {
  outputs: Set<Wallet.Cardano.TxOut>;
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

interface CalculateMaxAda {
  txBuilder: TxBuilder;
  address: Wallet.Cardano.PaymentAddress;
  maxAdaAmount: bigint;
  assetInfo: Assets;
  outputMap?: OutputsMap;
  signal: AbortSignal;
  adaErrorBuffer?: bigint;
  validateOutputs: WalletUtil['validateOutputs'];
}

const calculateMaxAda = async ({
  txBuilder,
  address,
  outputMap,
  maxAdaAmount,
  assetInfo,
  signal,
  validateOutputs,
  adaErrorBuffer = BigInt(0)
}: CalculateMaxAda): Promise<bigint> => {
  if (signal.aborted || adaErrorBuffer > maxAdaAmount || adaErrorBuffer > ADA_BUFFER_LIMIT) {
    throw new Error('Aborted');
  }
  const adaAmount = maxAdaAmount - adaErrorBuffer;

  const outputs = await createOutputsWithMaxAmount({
    address,
    adaAmount,
    assetInfo,
    outputMap,
    validateOutputs
  });

  const canBuildTx = await isTransactionBuildable({ outputs, txBuilder });

  if (canBuildTx) {
    return adaAmount;
  }

  return calculateMaxAda({
    txBuilder,
    validateOutputs,
    address,
    outputMap,
    maxAdaAmount,
    assetInfo,
    signal,
    adaErrorBuffer: adaErrorBuffer + BigInt(UTXO_DEPLETED_ADA_BUFFER)
  });
};

export const dCalculateMaxAda = pDebounce.promise(calculateMaxAda);

export const useMaxAda = (): bigint => {
  const [maxADA, setMaxADA] = useState<bigint>(BigInt(0));
  const { walletInfo, inMemoryWallet } = useWalletStore();
  const balance = useObservable(inMemoryWallet?.balance?.utxo.available$);
  const availableRewards = useObservable(inMemoryWallet?.balance?.rewardAccounts?.rewards$);
  const assetInfo = useObservable(inMemoryWallet?.assetInfo$);
  const { outputMap } = useTransactionProps();
  const { setMaxAdaLoading } = useMaxAdaStatus();
  const address = walletInfo.addresses[0].address;

  useEffect(() => {
    const abortController = new AbortController();

    const calculate = async () => {
      try {
        setMaxAdaLoading(true);
        const { validateOutputs, validateOutput } = Wallet.createWalletUtil(inMemoryWallet);
        const txBuilder = inMemoryWallet.createTxBuilder();
        const { fee, minimumCoins } = await getMinimumCoinsAndFee({
          address,
          balance,
          txBuilder,
          validateOutputs,
          validateOutput
        });

        // substract the fee and the missing coins from the wallet balances
        const spendableBalance = subtractValueQuantities([
          { coins: balance.coins + BigInt(availableRewards || 0) }, // wallet balance
          { coins: BigInt(minimumCoins) }, // this is the minimun coins needed for all the wallet tokens
          { coins: fee } // this is an approximate fee
        ]);

        const result = await dCalculateMaxAda({
          address,
          assetInfo,
          maxAdaAmount: spendableBalance.coins,
          txBuilder,
          validateOutputs,
          signal: abortController.signal,
          outputMap
        });

        if (!abortController.signal.aborted) {
          setMaxADA(result);
        }
      } catch {
        if (!abortController.signal.aborted) {
          setMaxADA(BigInt(0));
        }
      } finally {
        setMaxAdaLoading(false);
      }
    };

    if (balance) {
      calculate();
    }
    return () => {
      abortController.abort();
    };
  }, [availableRewards, assetInfo, balance, inMemoryWallet, address, outputMap, setMaxAdaLoading]);

  return maxADA;
};
