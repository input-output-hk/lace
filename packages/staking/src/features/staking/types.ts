import { Wallet } from '@lace/cardano';
import { Language } from '@lace/common';

export type StakingProps = {
  currentChain: Wallet.Cardano.ChainId;
  language?: Language;
  theme: 'light' | 'dark';
};
