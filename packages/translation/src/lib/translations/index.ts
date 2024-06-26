import { Language } from '../../types';

import { en as extension } from './browser-extension-wallet/en';
import { en as cardano } from './cardano/en';
import { en as core } from './core/en';
import { en as sharedWallets } from './shared-wallets/en';
import { en as staking } from './staking/en';

export const allTranslations = {
  [Language.en]: {
    ...core,
    ...cardano,
    ...extension,
    ...staking,
    ...sharedWallets,
  },
};

export const coreTranslations = {
  [Language.en]: core,
};

export const sharedWalletsTranslations = {
  [Language.en]: sharedWallets,
};

export const extensionTranslations = {
  [Language.en]: extension,
};

export const stakingTranslations = {
  [Language.en]: staking,
};
