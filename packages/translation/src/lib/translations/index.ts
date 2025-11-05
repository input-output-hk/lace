import { Language } from '../../types';

import { en as enExtension } from './browser-extension-wallet/en';
import { es as esExtension } from './browser-extension-wallet/es';
import { en as enCardano } from './cardano/en';
import { es as esCardano } from './cardano/es';
import { en as enCore } from './core/en';
import { es as esCore } from './core/es';
import { en as enSharedWallets } from './shared-wallets/en';
import { es as esSharedWallets } from './shared-wallets/es';
import { en as enStaking } from './staking/en';
import { es as esStaking } from './staking/es';
import { en as enSwaps } from './swaps/en';
import { es as esSwaps } from './swaps/es';

export const allTranslations = {
  [Language.en]: {
    ...enCore,
    ...enCardano,
    ...enExtension,
    ...enStaking,
    ...enSharedWallets,
    ...enSwaps,
  },
  [Language.es]: {
    ...esCore,
    ...esCardano,
    ...esExtension,
    ...esStaking,
    ...esSharedWallets,
    ...esSwaps,
  },
};

export const coreTranslations = {
  [Language.en]: enCore,
  [Language.es]: esCore,
};

export const sharedWalletsTranslations = {
  [Language.en]: enSharedWallets,
  [Language.es]: esSharedWallets,
};

export const extensionTranslations = {
  [Language.en]: enExtension,
  [Language.es]: esExtension,
};

export const stakingTranslations = {
  [Language.en]: enStaking,
  [Language.es]: esStaking,
};

export const swapsTranslations = {
  [Language.en]: enSwaps,
  [Language.es]: esSwaps,
};
