import { Cardano, Handle, HandleResolution } from '@cardano-sdk/core';
import { Assets } from '@cardano-sdk/wallet';
import { InitializeTxProps } from '@cardano-sdk/tx-construction';
import isEmpty from 'lodash/isEmpty';
import { assetBalanceToBigInt } from '../util/asset-balance';
import { getAuxiliaryData } from './get-auxiliary-data';
import { Wallet } from '@src/index';

type CardanoOutput = {
  address?: Cardano.TxOut['address'];
  value?: { coins: string; assets?: Map<Cardano.AssetId, string> };
  datum?: Cardano.TxOut['datum'];
  handle?: Handle;
};

type OutputsMap = Map<string, CardanoOutput>;

type TokenBalanceMap = Map<Cardano.AssetId, bigint>;

const convertAssetsToBigInt = (
  assets: CardanoOutput['value']['assets'],
  assetsInfo: Assets = new Map()
): TokenBalanceMap => {
  const assetMap: TokenBalanceMap = new Map();

  if (isEmpty(assets)) return assetMap;

  for (const [id, amount] of assets) {
    const assetInfo = assetsInfo.get(id);
    assetMap.set(id, assetBalanceToBigInt(amount, assetInfo));
  }

  return assetMap;
};

export const buildTransactionProps = (props: {
  outputsMap: OutputsMap;
  metadata?: string;
  assetsInfo?: Assets;
}): InitializeTxProps => {
  const txSet = new Set<Cardano.TxOut & { handleResolution?: HandleResolution }>();
  for (const output of props.outputsMap.values()) {
    // filter outputs that are missing fields
    if (output?.address && output?.value?.coins) {
      txSet.add({
        address: output.address,
        value: {
          coins: BigInt(output.value.coins),
          ...(output?.value?.assets && { assets: convertAssetsToBigInt(output.value.assets, props.assetsInfo) })
        },
        handleResolution: {
          handle: output.handle?.startsWith('$') ? output.handle.slice(1) : output.handle,
          cardanoAddress: output.address,
          hasDatum: !!output.datum,
          policyId: Wallet.Cardano.PolicyId('f0ff48bbb7bbe9d59a40f1ce90e9e9d0ff5002ec48f232b49ca0fb9a')
        }
      });
    }
  }

  return {
    outputs: txSet,
    ...(props.metadata && {
      auxiliaryData: getAuxiliaryData({ metadataString: props.metadata })
    })
  };
};
