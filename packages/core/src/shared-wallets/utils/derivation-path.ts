import { Wallet } from '@lace/cardano';

export const paymentScriptKeyPath = {
  index: 0,
  role: Wallet.KeyManagement.KeyRole.External,
};

export const stakingScriptKeyPath = {
  index: 0,
  role: Wallet.KeyManagement.KeyRole.Stake,
};
