import { sha256 } from '@noble/hashes/sha2';
import { bytesToHex } from '@noble/hashes/utils';

import { createBlockchainWalletEntity } from './create-in-memory-wallet-entity';
import { passkeyAccountPublicKey } from './passkey-account-public-key';
import { PasskeyWalletMismatchError } from './passkey-wallet-mismatch-error';

import type { LaceWallet } from './create-lace-wallet';
import type { Bip32PublicKeyHex } from '@cardano-sdk/crypto';
import type { CardanoBip32AccountProps } from '@lace-contract/cardano-context';
import type {
  LazyInMemoryWallet,
  LazyInMemoryWalletAccount,
} from '@lace-contract/wallet-repo';
import type { PasskeyCredentialRef, PasskeyKeySource } from '@lace-lib/passkey';

/**
 * The public identity of a passkey wallet: the credential ID, relying-party
 * ID and recipe version of its passkey, and the fingerprint of its Cardano
 * account key. Persist only this binding, never PRF outputs or words.
 */
export type PasskeyWalletBinding = PasskeyCredentialRef & {
  /**
   * SHA-256 of the UTF-8 bytes of the Cardano extended account public key's
   * hex string (not of the key bytes), as hex.
   */
  fingerprint: string;
};

const fingerprint = (publicKey: Bip32PublicKeyHex): string =>
  bytesToHex(sha256(new TextEncoder().encode(publicKey)));

/** The options of `createPasskeyWalletEntity`. */
export type CreatePasskeyWalletEntityProps = {
  /** The passkey, from `createPasskeyKeySource`. */
  keySource: PasskeyKeySource;
  /** The wallet's display name. */
  walletName: string;
  /**
   * The binding saved when the wallet was first created. A passkey that
   * derives another account throws `PasskeyWalletMismatchError`.
   */
  expectedBinding?: PasskeyWalletBinding;
};

/**
 * Derives the Cardano wallet of a passkey in one assertion, checks it against
 * an expected binding, and returns its wallet entity with the binding to
 * persist. The entity is a `LazyInMemoryWallet`: it stores only public keys,
 * and `createPasskeyVaultModule` signs for it.
 *
 * @param wallet - The wallet the entity is for.
 * @param props - The key source, the name and the saved binding.
 * @returns The entity, for `wallets.addWallet`, and the binding to persist.
 *   Rejects with `PasskeyWalletMismatchError` when the passkey serves another
 *   account than `expectedBinding`.
 */
export const createPasskeyWalletEntity = async (
  wallet: LaceWallet,
  { keySource, walletName, expectedBinding }: CreatePasskeyWalletEntityProps,
): Promise<{ entity: LazyInMemoryWallet; binding: PasskeyWalletBinding }> => {
  // Discover the existing credential after storage clear; never create one implicitly.
  const ref = keySource.credentialRef();
  if (
    expectedBinding &&
    ref &&
    (ref.credentialId !== expectedBinding.credentialId ||
      ref.rpId !== expectedBinding.rpId ||
      ref.recipeVersion !== expectedBinding.recipeVersion)
  ) {
    throw new PasskeyWalletMismatchError();
  }

  return keySource.withPasskeyMnemonic(async words => {
    const assertedRef = keySource.credentialRef();
    if (
      !assertedRef ||
      (ref && assertedRef.credentialId !== ref.credentialId)
    ) {
      throw new PasskeyWalletMismatchError();
    }
    const publicKey = await passkeyAccountPublicKey(words);
    const binding: PasskeyWalletBinding = {
      ...assertedRef,
      fingerprint: fingerprint(publicKey),
    };
    if (
      expectedBinding &&
      (binding.credentialId !== expectedBinding.credentialId ||
        binding.rpId !== expectedBinding.rpId ||
        binding.recipeVersion !== expectedBinding.recipeVersion ||
        binding.fingerprint !== expectedBinding.fingerprint)
    ) {
      throw new PasskeyWalletMismatchError();
    }

    const entity = await createBlockchainWalletEntity(wallet, 'Cardano', {
      mnemonicWords: [...words],
      walletName,
    });
    const accounts = entity.accounts.filter(
      (
        account,
      ): account is LazyInMemoryWalletAccount<CardanoBip32AccountProps> =>
        account.blockchainName === 'Cardano',
    );
    if (
      accounts.length === 0 ||
      accounts.some(
        account =>
          account.blockchainSpecific.extendedAccountPublicKey !== publicKey,
      )
    ) {
      throw new PasskeyWalletMismatchError();
    }
    return { entity: { ...entity, accounts }, binding };
  });
};
