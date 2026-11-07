import { SecretBox } from '@lace-lib/core';
import { ByteArray } from '@lace-lib/util';
import { HDWallet, Roles } from '@midnightntwrk/wallet-sdk/hd';
import { createKeystore } from '@midnightntwrk/wallet-sdk/unshielded';
import { Observable } from 'rxjs';

import type { AuthSecret } from '@lace-contract/authentication-prompt';
import type { MidnightAccountProps } from '@lace-contract/midnight-context';
import type {
  AccountKeys,
  MidnightSDKNetworkId,
} from '@lace-contract/midnight-context';
import type { HexBytes } from '@lace-lib/util';
import type { UnshieldedKeystore } from '@midnightntwrk/wallet-sdk/unshielded';

/** The ECDSA identity has its own role; it must never reuse NightExternal. */
export const deriveEcdsaKey = (
  seed: Uint8Array,
  accountIndex: number,
): Uint8Array => {
  const generated = HDWallet.fromSeed(seed);
  if (generated.type !== 'seedOk')
    throw new Error('Failed to derive Midnight signing key');
  try {
    const derived = generated.hdWallet
      .selectAccount(accountIndex)
      .selectRole(Roles.EcdsaUnshielded)
      .deriveKeyAt(0);
    if (derived.type !== 'keyDerived')
      throw new Error('Failed to derive ECDSA signing key');
    return derived.key;
  } finally {
    generated.hdWallet.clear();
  }
};

/** Own the decrypted buffers and revoke signing when the account cache clears. */
export const createAccountKeys = (
  [nightKeyBuffer, dustKeyBuffer, zswapKeyBuffer, ecdsaKeyBuffer]: readonly [
    ByteArray,
    ByteArray,
    ByteArray,
    ByteArray,
  ],
  networkId: MidnightSDKNetworkId,
): AccountKeys => {
  let isCleared = false;
  const keystore = (
    kind: 'ecdsa' | 'schnorr',
    secret: ByteArray,
  ): UnshieldedKeystore => {
    // The SDK captures an immutable secret hex string. Keep that copy scoped to
    // one call rather than retaining it after the owning buffer has been wiped.
    const current = () => {
      if (isCleared) throw new Error('Midnight account keys have been cleared');
      return createKeystore({ kind, secret }, networkId);
    };
    return {
      getSecretKey: () => current().getSecretKey(),
      getPublicKey: () => current().getPublicKey(),
      getAddress: () => current().getAddress(),
      getBech32Address: () => current().getBech32Address(),
      signData: data => current().signData(data),
      signDataAsync: async data => current().signDataAsync(data),
    };
  };
  return {
    unshieldedKeystore: keystore('schnorr', nightKeyBuffer),
    ecdsaKeystore: keystore('ecdsa', ecdsaKeyBuffer),
    walletKeys: { dustKeyBuffer, zswapKeyBuffer },
    clear: () => {
      isCleared = true;
      for (const buffer of [
        nightKeyBuffer,
        dustKeyBuffer,
        zswapKeyBuffer,
        ecdsaKeyBuffer,
      ])
        buffer.fill(0);
    },
  };
};

/** Revoke a completed decrypt if its account watcher was removed while awaiting it. */
export const loadAccountKeys = (
  account: MidnightAccountProps,
  encryptedSeed: HexBytes,
  authSecret: AuthSecret,
): Observable<AccountKeys> =>
  new Observable(subscriber => {
    const load = async () => {
      const buffers: ByteArray[] = [];
      let seed: ByteArray | undefined;
      const decrypt = async (encrypted: HexBytes) =>
        ByteArray(
          await SecretBox.open(ByteArray.fromHex(encrypted), authSecret),
        );
      try {
        for (const key of [
          account.nightExternalKey,
          account.dustKey,
          account.zswapKey,
        ]) {
          buffers.push(await decrypt(key.encryptedKey));
        }
        seed = await decrypt(encryptedSeed);
        buffers.push(ByteArray(deriveEcdsaKey(seed, account.accountIndex)));
        return createAccountKeys(
          [buffers[0], buffers[1], buffers[2], buffers[3]],
          account.networkId,
        );
      } catch (error) {
        buffers.forEach(buffer => buffer.fill(0));
        throw error;
      } finally {
        seed?.fill(0);
      }
    };
    void load().then(
      keys => {
        if (subscriber.closed) keys.clear();
        else {
          subscriber.next(keys);
          subscriber.complete();
        }
      },
      error => {
        subscriber.error(error);
      },
    );
  });
