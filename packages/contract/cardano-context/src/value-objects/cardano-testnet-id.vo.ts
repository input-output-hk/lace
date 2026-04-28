import { Cardano } from '@cardano-sdk/core';

export type CardanoTestnetId = 'preprod' | 'preview' | 'sanchonet';

const CARDANO_TESTNET_IDS: readonly CardanoTestnetId[] = [
  'preprod',
  'preview',
  'sanchonet',
];

const CARDANO_CHAIN_ID_BY_TESTNET: Record<CardanoTestnetId, Cardano.ChainId> = {
  preprod: Cardano.ChainIds.Preprod,
  preview: Cardano.ChainIds.Preview,
  sanchonet: Cardano.ChainIds.Sanchonet,
};

const PREPROD_MAGIC = Number(Cardano.ChainIds.Preprod.networkMagic);
const PREVIEW_MAGIC = Number(Cardano.ChainIds.Preview.networkMagic);
const SANCHONET_MAGIC = Number(Cardano.ChainIds.Sanchonet.networkMagic);

export const isCardanoTestnetId = (
  value: string | undefined,
): value is CardanoTestnetId =>
  CARDANO_TESTNET_IDS.includes(value as CardanoTestnetId);

export const getCardanoTestnetIdByNetworkMagic = (
  networkMagic: number,
): CardanoTestnetId | undefined => {
  const magic = Number(networkMagic);
  if (magic === PREPROD_MAGIC) return 'preprod';
  if (magic === PREVIEW_MAGIC) return 'preview';
  if (magic === SANCHONET_MAGIC) return 'sanchonet';
  return undefined;
};

export const getCardanoChainIdByTestnetId = (
  id: CardanoTestnetId,
): Cardano.ChainId => CARDANO_CHAIN_ID_BY_TESTNET[id];

export const resolveCardanoTestnetChainId = (
  testnetId: string | undefined,
  fallback: Cardano.ChainId,
): Cardano.ChainId => {
  if (!isCardanoTestnetId(testnetId)) return fallback;
  return CARDANO_CHAIN_ID_BY_TESTNET[testnetId];
};
