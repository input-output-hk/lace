import type { DappCategory } from '../types';
import type { TranslationKey, TFunction } from '@lace-contract/i18n';

export const dappCategoryTranslationKeyById: Record<string, TranslationKey> = {
  'show all': 'v2.dapp-explorer.category.show-all',
  games: 'v2.dapp-explorer.category.games',
  defi: 'v2.dapp-explorer.category.defi',
  collectibles: 'v2.dapp-explorer.category.collectibles',
  marketplaces: 'v2.dapp-explorer.category.marketplaces',
  'high-risk': 'v2.dapp-explorer.category.high-risk',
  gambling: 'v2.dapp-explorer.category.gambling',
  exchanges: 'v2.dapp-explorer.category.exchanges',
  social: 'v2.dapp-explorer.category.social',
  other: 'v2.dapp-explorer.category.other',
  bridges: 'v2.dapp-explorer.category.bridges',
  swaps: 'v2.dapp-explorer.category.swaps',
};

export const getDappCategoryLabel = (
  t: TFunction,
  category: DappCategory,
): string => {
  const key = dappCategoryTranslationKeyById[String(category)];
  return key ? t(key) : String(category);
};
