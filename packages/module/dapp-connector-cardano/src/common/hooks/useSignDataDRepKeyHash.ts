import * as Crypto from '@cardano-sdk/crypto';
import { blake2b } from '@cardano-sdk/crypto';
import { Bip32Account, KeyRole } from '@cardano-sdk/key-management';
import { isCardanoAccount } from '@lace-contract/cardano-context';
import { useEffect, useMemo, useState } from 'react';

import { useLaceSelector } from './storeHooks';

import type { Ed25519KeyHashHex } from '@cardano-sdk/crypto';

/**
 * Derives the DRep key hash of the account bound to a dApp origin. The
 * sign-data dialog uses it to tell a CIP-95 DRep signing request apart from a
 * genuine enterprise payment address (both are type-6 enterprise addresses).
 *
 * Derivation is public (no secret) and async, so the hash resolves on a later
 * render; returns undefined until then, or when no Cardano single-sig account
 * is resolved.
 */
export const useSignDataDRepKeyHash = (
  dappOrigin?: string,
): Ed25519KeyHashHex | undefined => {
  const allAccounts = useLaceSelector('wallets.selectActiveNetworkAccounts');
  const sessionAccountByOrigin = useLaceSelector(
    'cardanoDappConnector.selectSessionAccountByOrigin',
  );
  const [dRepKeyHash, setDRepKeyHash] = useState<Ed25519KeyHashHex>();

  const account = useMemo(() => {
    if (!dappOrigin) return undefined;
    const accountId = sessionAccountByOrigin[dappOrigin];
    if (!accountId) return undefined;
    return allAccounts.find(a => a.accountId === accountId);
  }, [dappOrigin, allAccounts, sessionAccountByOrigin]);

  useEffect(() => {
    setDRepKeyHash(undefined);
    if (
      !account ||
      !isCardanoAccount(account) ||
      account.accountType === 'MultiSig'
    ) {
      return;
    }

    let isCancelled = false;
    const { accountIndex, extendedAccountPublicKey, chainId } =
      account.blockchainSpecific;

    void (async () => {
      const bip32Ed25519 = await Crypto.SodiumBip32Ed25519.create();
      const bip32Account = new Bip32Account(
        { extendedAccountPublicKey, accountIndex, chainId },
        { blake2b, bip32Ed25519 },
      );
      const dRepPubKey = await bip32Account.derivePublicKey({
        index: 0,
        role: KeyRole.DRep,
      });
      return Crypto.Ed25519PublicKey.fromHex(dRepPubKey).hash().hex();
    })()
      .then(hash => {
        if (!isCancelled) setDRepKeyHash(hash);
      })
      .catch(() => {
        if (!isCancelled) setDRepKeyHash(undefined);
      });

    return () => {
      isCancelled = true;
    };
  }, [account]);

  return dRepKeyHash;
};
