import { Cardano } from '@cardano-sdk/core';

/**
 * Shared building blocks for "Lace-promoted" delegation targets carried in
 * feature-flag payloads (promoted DReps in governance, promoted pools in
 * staking, and the earn-rewards target that reads both). Kept here — the
 * common Cardano contract both domains already depend on — so the
 * network-key mapping and localized-copy picker are defined once rather than
 * duplicated or cross-imported between the sibling domain contracts.
 */

/** Cardano network keys used to key promoted-target payloads. */
export type CardanoPromotedNetworkKey =
  | 'mainnet'
  | 'preprod'
  | 'preview'
  | 'sanchonet';

const NETWORK_MAGIC_TO_PROMOTED_KEY: Record<number, CardanoPromotedNetworkKey> =
  {
    [Number(Cardano.ChainIds.Mainnet.networkMagic)]: 'mainnet',
    [Number(Cardano.ChainIds.Preprod.networkMagic)]: 'preprod',
    [Number(Cardano.ChainIds.Preview.networkMagic)]: 'preview',
    [Number(Cardano.ChainIds.Sanchonet.networkMagic)]: 'sanchonet',
  };

/** Maps an active chain id to its promoted-payload key (undefined for unknown networks). */
export const promotedNetworkKeyForChainId = (
  chainId: Cardano.ChainId,
): CardanoPromotedNetworkKey | undefined =>
  NETWORK_MAGIC_TO_PROMOTED_KEY[Number(chainId.networkMagic)];

/** Localized promotional copy for a promoted target, keyed by language code (e.g. `en`, `es`, `ja`). */
export type PromotedInformation = { [languageCode: string]: string };

/** English is the guaranteed-present fallback language for promotional copy. */
const PROMOTED_INFORMATION_FALLBACK_LANGUAGE = 'en';

/** Picks the promotional copy for the given language: exact → 2-letter prefix → English → first available. */
export const pickPromotedInformation = (
  information: PromotedInformation | undefined,
  language: string,
): string | undefined => {
  if (!information) return undefined;
  return (
    information[language] ??
    information[language.split('-')[0]] ??
    information[PROMOTED_INFORMATION_FALLBACK_LANGUAGE] ??
    Object.values(information)[0]
  );
};
