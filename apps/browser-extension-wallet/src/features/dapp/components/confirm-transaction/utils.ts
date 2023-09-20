import { Wallet } from '@lace/cardano';
import { assetsBurnedInspector, assetsMintedInspector, createTxInspector } from '@cardano-sdk/core';
import { CardanoTxOut } from '@src/types';

export const getTransactionAssetsId = (outputs: CardanoTxOut[]): Wallet.Cardano.AssetId[] => {
  const assetIds: Wallet.Cardano.AssetId[] = [];
  const assetMaps = outputs.map((output) => output.value.assets);
  for (const asset of assetMaps) {
    if (asset) {
      for (const id of asset.keys()) {
        !assetIds.includes(id) && assetIds.push(id);
      }
    }
  }
  return assetIds;
};

export const getTxType = (tx: Wallet.Cardano.Tx): 'Send' | 'Mint' | 'Burn' => {
  const inspector = createTxInspector({
    minted: assetsMintedInspector,
    burned: assetsBurnedInspector
  });

  const { minted, burned } = inspector(tx as Wallet.Cardano.HydratedTx);
  const isMintTransaction = minted.length > 0;
  const isBurnTransaction = burned.length > 0;

  if (isMintTransaction) {
    return 'Mint';
  }

  if (isBurnTransaction) {
    return 'Burn';
  }

  return 'Send';
};
