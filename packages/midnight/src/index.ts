import { util } from '@cardano-sdk/key-management';
import { Resource, WalletBuilder } from '@midnight-ntwrk/wallet';
import { Wallet } from '@midnight-ntwrk/wallet-api';
import { DEFAULT_NETWORK_ADDRESSES, MIDNIGHT_NETWORK_ID } from '@src/config';

const convertHttpToWebSocket = (address: string) => `${address.replace(/(http)(s)?:\/\//, 'ws$2://')}/ws`;

export type MidnightWallet = Wallet & Resource;

export const createMidnightWallet = async (mnemonic: string[]): Promise<MidnightWallet> => {
  const { nodeAddress, pubSubAddress, proverAddress } = DEFAULT_NETWORK_ADDRESSES[MIDNIGHT_NETWORK_ID];
  const entropy = util.mnemonicWordsToEntropy(mnemonic);

  const wallet = await WalletBuilder.buildFromSeed(
    pubSubAddress,
    convertHttpToWebSocket(pubSubAddress),
    proverAddress,
    nodeAddress,
    entropy
  );

  wallet.start();

  return wallet;
};
