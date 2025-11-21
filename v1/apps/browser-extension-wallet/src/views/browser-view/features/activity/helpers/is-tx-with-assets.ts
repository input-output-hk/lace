import { Wallet } from '@lace/cardano';
import { Tokens } from '@src/types';
import isEmpty from 'lodash/isEmpty';

export const isTxWithAssets = (id?: Wallet.Cardano.AssetId, assets?: Tokens): boolean => {
  if (!id || isEmpty(assets)) return false;

  if (!assets.has(id)) return false;

  return true;
};
