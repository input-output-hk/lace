import { AddressType } from '@cardano-sdk/key-management';
import { Bip32Account } from '@lace-lib/core';

import type { Cardano } from '@cardano-sdk/core';
import type { Bip32PublicKeyHex } from '@cardano-sdk/crypto';
import type { LaceResult, WalletInfo } from '@lace-lib/extension-shell-api';

type CryptoDependencies = ConstructorParameters<typeof Bip32Account>[1];

/** The host-owned account a provider call resolves to — a (walletId,
 * accountIndex) pair (the canonical pair the account-scoped wire methods
 * carry; ADR 11 the host derives the network). */
export type ResolvedAccount = { walletId: string; accountIndex: number };

/** A resolved reward account: its owning account, plus whether it is that
 * account's PRIMARY (stake key 0) reward account — the partition that claims
 * utxos carrying no stake credential (see store/dependencies.ts). */
export type ResolvedRewardAccount = ResolvedAccount & { primary: boolean };

type Cache = {
  xpubToAccount: Map<string, ResolvedAccount>;
  rewardAccountToAccount: Map<string, ResolvedRewardAccount>;
};

/**
 * Resolves the host's (walletId, accountIndex) pair from what the
 * `CardanoProvider` methods actually carry — an xpub (discoverAddresses) or a
 * reward account (getAccountUtxos) — since cardano-sync (kept verbatim) never
 * passes a walletId. The xpub map is network-independent (the account xpub
 * identifies the account regardless of network); the reward-account map covers,
 * for accounts ON the caller's active network, EVERY stake key the host's
 * discovery walk found — a multi-stake-key account fetches utxos once per key,
 * so a map holding stake key 0 alone would fail (and, since cardano-sync fans
 * out and rethrows, abort) the whole account's fetch. submitTx needs no
 * resolver: it is account-agnostic on the wire and the host attributes the
 * pending overlay from the decoded tx inputs itself.
 *
 * Cache misses trigger one refresh so a newly created/imported wallet (or a
 * newly added account, or a stake key discovered since the last build) is
 * picked up.
 */
export class WalletResolver {
  #cache?: Cache;

  public constructor(
    private readonly listWallets: () => Promise<LaceResult<WalletInfo[]>>,
    private readonly getAddresses: (args: {
      walletId: string;
      accountIndex: number;
      networkMagic: number;
    }) => Promise<LaceResult<{ rewardAccounts: string[] }>>,
    private readonly crypto: CryptoDependencies,
  ) {}

  public async accountForXpub(
    xpub: string,
    chainId: Cardano.ChainId,
  ): Promise<ResolvedAccount | undefined> {
    return this.#resolve(chainId, cache => cache.xpubToAccount.get(xpub));
  }

  public async accountForRewardAccount(
    rewardAccount: string,
    chainId: Cardano.ChainId,
  ): Promise<ResolvedRewardAccount | undefined> {
    return this.#resolve(chainId, cache =>
      cache.rewardAccountToAccount.get(rewardAccount),
    );
  }

  async #build(chainId: Cardano.ChainId): Promise<Cache> {
    const result = await this.listWallets();
    if (!result.ok) {
      throw new Error(`wallets.list failed: ${result.error.message}`);
    }
    const xpubToAccount = new Map<string, ResolvedAccount>();
    const rewardAccountToAccount = new Map<string, ResolvedRewardAccount>();
    for (const wallet of result.value) {
      for (const account of wallet.cardanoAccounts) {
        const resolved: ResolvedAccount = {
          walletId: wallet.walletId,
          accountIndex: account.accountIndex,
        };
        // The account xpub identifies the account across networks.
        xpubToAccount.set(account.xpub, resolved);
        // The reward account is network-specific, so map only accounts on the
        // caller's active network — the only ones cardano-sync fetches utxos
        // for (it derives their reward account off the same chainId).
        if (account.networkMagic !== chainId.networkMagic) continue;
        const bip32 = new Bip32Account(
          {
            extendedAccountPublicKey: account.xpub as Bip32PublicKeyHex,
            chainId,
            accountIndex: account.accountIndex,
          },
          this.crypto,
        );
        const grouped = await bip32.deriveAddress(
          { type: AddressType.External, index: 0 },
          0,
        );
        // Stake key 0 stands on its own derivation (no secret): an account the
        // host has not discovered yet still resolves its primary reward account.
        rewardAccountToAccount.set(String(grouped.rewardAccount), {
          ...resolved,
          primary: true,
        });
        const addresses = await this.getAddresses({
          walletId: wallet.walletId,
          accountIndex: account.accountIndex,
          networkMagic: chainId.networkMagic,
        });
        if (!addresses.ok) continue;
        const { rewardAccounts } = addresses.value;
        for (const [index, rewardAccount] of rewardAccounts.entries()) {
          rewardAccountToAccount.set(rewardAccount, {
            ...resolved,
            primary: index === 0,
          });
        }
      }
    }
    this.#cache = { xpubToAccount, rewardAccountToAccount };
    return this.#cache;
  }

  async #resolve<T>(
    chainId: Cardano.ChainId,
    pick: (cache: Cache) => T | undefined,
  ): Promise<T | undefined> {
    const cached = this.#cache && pick(this.#cache);
    if (cached) return cached;
    return pick(await this.#build(chainId));
  }
}
