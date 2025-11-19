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

// Use tsc (typecheck) to verify that translation files are in sync
// for V1 use granular detail for each main file
const _enExtension: typeof enExtension = esExtension;
const _esExtension: typeof esExtension = enExtension;
const _enCardano: typeof enCardano = esCardano;
const _esCardano: typeof esCardano = enCardano;
const _enCore: typeof enCore = esCore;
const _esCore: typeof esCore = enCore;
const _enSharedWallets: typeof enSharedWallets = esSharedWallets;
const _esSharedWallets: typeof esSharedWallets = enSharedWallets;
const _enStaking: typeof enStaking = esStaking;
const _esStaking: typeof esStaking = enStaking;
const _enSwaps: typeof enSwaps = esSwaps;
const _esSwaps: typeof esSwaps = enSwaps;
// eslint-disable-next-line @typescript-eslint/no-unused-expressions
_enExtension;
// eslint-disable-next-line @typescript-eslint/no-unused-expressions
_esExtension;
// eslint-disable-next-line @typescript-eslint/no-unused-expressions
_enCardano;
// eslint-disable-next-line @typescript-eslint/no-unused-expressions
_esCardano;
// eslint-disable-next-line @typescript-eslint/no-unused-expressions
_enCore;
// eslint-disable-next-line @typescript-eslint/no-unused-expressions
_esCore;
// eslint-disable-next-line @typescript-eslint/no-unused-expressions
_enSharedWallets;
// eslint-disable-next-line @typescript-eslint/no-unused-expressions
_esSharedWallets;
// eslint-disable-next-line @typescript-eslint/no-unused-expressions
_enStaking;
// eslint-disable-next-line @typescript-eslint/no-unused-expressions
_esStaking;
// eslint-disable-next-line @typescript-eslint/no-unused-expressions
_enSwaps;
// eslint-disable-next-line @typescript-eslint/no-unused-expressions
_esSwaps;
