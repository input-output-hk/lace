import { en as extension } from './browser-extension-wallet/en';
import { en as cardano } from './cardano/en';
import { en as core } from './core/en';
import { en as staking } from './staking/en';

export const en = {
  ...core,
  ...cardano,
  ...extension,
  ...staking,
};
