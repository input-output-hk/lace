/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable unicorn/no-null */
import {
  AssetProvider,
  Cardano,
  ChainHistoryProvider,
  DRepProvider,
  NetworkInfoProvider,
  RewardAccountInfoProvider,
  RewardsProvider,
  StakePoolProvider,
  TxSubmitProvider,
  UtxoProvider
} from '@cardano-sdk/core';
import { AddressDiscovery, ObservableWallet } from '@cardano-sdk/wallet';
import * as KeyManagement from '@cardano-sdk/key-management';
import { AnyWallet, Bip32WalletAccount, SigningCoordinatorConfirmationApi } from '@cardano-sdk/web-extension';
import * as Crypto from '@cardano-sdk/crypto';
import { Wallet } from '@src/index';
import { HexBlob } from '@cardano-sdk/util';
import { WsProvider } from '@cardano-sdk/cardano-services-client';

let bip32Ed25519: Promise<Crypto.SodiumBip32Ed25519> | undefined;

export const getBip32Ed25519 = async (): Promise<Crypto.SodiumBip32Ed25519> =>
  bip32Ed25519 || (bip32Ed25519 = Crypto.SodiumBip32Ed25519.create());

export interface WalletMetadata {
  name: string;
  lockValue?: HexBlob;
  lastActiveAccountIndex?: number;
  walletAddresses?: Cardano.PaymentAddress[];
  coSigners?: { sharedWalletKey: Wallet.Crypto.Bip32PublicKeyHex; name: string }[];
}

export interface AccountMetadata {
  name: string;
  namiMode?: {
    avatar: string;
    balance?: Partial<Record<Wallet.ChainName, string>>;
    address?: Partial<Record<Wallet.ChainName, string>>;
    recentSendToAddress?: Partial<Record<Wallet.ChainName, string>>;
  };
  bitcoin?: {
    extendedAccountPublicKeys: {
      mainnet: {
        legacy: string;
        segWit: string;
        nativeSegWit: string;
        taproot: string;
        electrumNativeSegWit: string;
      },
      testnet: {
        legacy: string;
        segWit: string;
        nativeSegWit: string;
        taproot: string;
        electrumNativeSegWit: string;
      }
    }
  }
}

export interface CardanoWallet {
  wallet: ObservableWallet;
  source: {
    wallet: AnyWallet<WalletMetadata, AccountMetadata>;
    account?: Bip32WalletAccount<AccountMetadata>;
  };
  name: string;
  signingCoordinator: SigningCoordinatorConfirmationApi<WalletMetadata, AccountMetadata>;
}

export interface WalletProvidersDependencies {
  stakePoolProvider: StakePoolProvider;
  assetProvider: AssetProvider;
  txSubmitProvider: TxSubmitProvider;
  networkInfoProvider: NetworkInfoProvider;
  utxoProvider: UtxoProvider;
  rewardAccountInfoProvider: RewardAccountInfoProvider;
  rewardsProvider: RewardsProvider;
  chainHistoryProvider: ChainHistoryProvider;
  wsProvider?: WsProvider;
  drepProvider: DRepProvider;
  addressDiscovery?: AddressDiscovery;
  inputResolver?: Cardano.InputResolver;
}

/**
 * Compare extended account public key derived from the mnemonic with the provided one.
 */
export const validateWalletMnemonic = async (
  mnemonicWords: string[],
  expectedExtendedAccountPublicKey: Wallet.Crypto.Bip32PublicKeyHex
): Promise<boolean> => {
  // To verify password
  const validatingKeyAgent = await KeyManagement.InMemoryKeyAgent.fromBip39MnemonicWords(
    {
      mnemonicWords,
      // XPUB is the same for all networks, but we're deriving it by creating a key agent which has chainId as a required parameter.
      // Ideally we would have a util that just derives the xpub without the redundant parameters.
      chainId: Cardano.ChainIds.Mainnet, // does not matter
      getPassphrase: async () => Buffer.from('doesnt matter')
    },
    {
      logger: console,
      bip32Ed25519: await getBip32Ed25519()
    }
  );

  const originalPublicKey = expectedExtendedAccountPublicKey;
  const validatingPublicKey = validatingKeyAgent.extendedAccountPublicKey;

  return originalPublicKey === validatingPublicKey;
};
