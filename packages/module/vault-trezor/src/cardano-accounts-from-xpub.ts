import {
  CardanoAccountId,
  type CardanoBip32AccountProps,
  getNetworkDetails,
} from '@lace-contract/cardano-context';

import type { Bip32PublicKeyHex } from '@cardano-sdk/crypto';
import type { State } from '@lace-contract/module';
import type { BlockchainNetworkId } from '@lace-contract/network';
import type {
  HardwareWalletAccount,
  WalletId,
} from '@lace-contract/wallet-repo';

export interface CardanoAccountsFromXpubArgs {
  state: State;
  walletId: WalletId;
  accountIndex: number;
  accountName: string;
  targetNetworks: Set<BlockchainNetworkId>;
  publicKey: Bip32PublicKeyHex;
}

export const cardanoAccountsFromXpub = ({
  state,
  walletId,
  accountIndex,
  accountName,
  targetNetworks,
  publicKey,
}: CardanoAccountsFromXpubArgs): HardwareWalletAccount<CardanoBip32AccountProps>[] =>
  [...targetNetworks].map(targetNetworkId => {
    const { chainId, networkId, networkType } = getNetworkDetails(
      state,
      targetNetworkId,
    );

    return {
      networkType,
      blockchainNetworkId: networkId,
      accountType: 'HardwareTrezor',
      walletId,
      accountId: CardanoAccountId(walletId, accountIndex, chainId.networkMagic),
      blockchainName: 'Cardano',
      metadata: { name: accountName },
      blockchainSpecific: {
        chainId,
        accountIndex,
        extendedAccountPublicKey: publicKey,
        networkId,
      } satisfies CardanoBip32AccountProps,
    };
  });
