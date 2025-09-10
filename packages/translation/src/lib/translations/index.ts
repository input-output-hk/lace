import { Language } from '../../types';

import { en as enExtension } from './browser-extension-wallet/en';
import { ja as jaExtension } from './browser-extension-wallet/ja';
import { en as enCardano } from './cardano/en';
import { ja as jaCardano } from './cardano/ja';
import { en as enCore } from './core/en';
import { ja as jaCore } from './core/ja';
import { en as enSharedWallets } from './shared-wallets/en';
import { ja as jaSharedWallets } from './shared-wallets/ja';
import { en as enStaking } from './staking/en';
import { ja as jaStaking } from './staking/ja';

export const allTranslations = {
  [Language.en]: {
    ...enCore,
    ...enCardano,
    ...enExtension,
    ...enStaking,
    ...enSharedWallets,
  },
  [Language.ja]: {
    ...jaCore,
    ...jaCardano,
    ...jaExtension,
    ...jaStaking,
    ...jaSharedWallets,
  },
};

export const coreTranslations = {
  [Language.en]: enCore,
  [Language.ja]: jaCore,
};

export const sharedWalletsTranslations = {
  [Language.en]: enSharedWallets,
  [Language.ja]: jaSharedWallets,
};

export const extensionTranslations = {
  [Language.en]: enExtension,
  [Language.ja]: jaExtension,
};

export const stakingTranslations = {
  [Language.en]: enStaking,
  [Language.ja]: jaStaking,
};
