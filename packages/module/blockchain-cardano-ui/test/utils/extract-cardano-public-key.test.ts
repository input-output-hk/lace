import { Bip32PublicKeyHex } from '@cardano-sdk/crypto';
import {
  CardanoNetworkId,
  Cip1852ExtendedAccountPublicKey,
} from '@lace-contract/cardano-context';
import { AccountId, WalletId } from '@lace-contract/wallet-repo';
import { describe, expect, it } from 'vitest';

import { extractCardanoPublicExtendedKey } from '../../src/utils/extract-cardano-public-key';

import type { AnyAccount } from '@lace-contract/wallet-repo';

describe('extractCardanoPublicExtendedKey', () => {
  const cardanoWalletXpubMock = Bip32PublicKeyHex(
    '62b217823bfc406941d932564234e17c258ad63ae983ffaba83b280edbae8db93408b3c38f0bdda2bbf32237e58d90c7759d9a7cbe065114258dfe5c9ea152cb',
  );

  const cardanoAccountWithKey: AnyAccount = {
    accountId: AccountId('cardano-account-1'),
    accountType: 'InMemory',
    blockchainName: 'Cardano',
    blockchainSpecific: {
      extendedAccountPublicKey: cardanoWalletXpubMock,
    },
    metadata: { name: 'Cardano Account 1' },
    networkType: 'testnet',
    blockchainNetworkId: CardanoNetworkId(1),
    walletId: WalletId('wallet-1'),
  };

  const cardanoAccountWithoutKey: AnyAccount = {
    ...cardanoAccountWithKey,
    blockchainSpecific: {},
  };

  const nonCardanoAccount: AnyAccount = {
    ...cardanoAccountWithKey,
    blockchainName: 'Bitcoin',
  };

  it('should return the extended public key for a Cardano account that has one', () => {
    expect(extractCardanoPublicExtendedKey(cardanoAccountWithKey)).toBe(
      Cip1852ExtendedAccountPublicKey(
        'acct_xvk1v2ep0q3ml3qxjswexftyyd8p0sjc4436axpll2ag8v5qakaw3kungz9ncw8shhdzh0ejydl93kgvwavanf7tupj3zsjcmljun6s49jc2vnqx7',
      ),
    );
  });

  it('should return undefined for a Cardano account that does not have an extended public key', () => {
    expect(
      extractCardanoPublicExtendedKey(cardanoAccountWithoutKey),
    ).toBeUndefined();
  });

  it('should throw an error for a non-Cardano account', () => {
    expect(() => extractCardanoPublicExtendedKey(nonCardanoAccount)).toThrow(
      'Unsupported blockchain: Bitcoin',
    );
  });
});
