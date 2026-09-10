import { AddressType } from '@cardano-sdk/key-management';
import { Bip32Account } from '@lace-lib/core';
import { beforeAll, describe, expect, it } from 'vitest';

import { WalletResolver } from '../src/wallet-resolver';

import type { Cardano } from '@cardano-sdk/core';
import type { LaceResult, WalletInfo } from '@lace-lib/extension-shell-api';

(globalThis as Record<string, unknown>).self ??= globalThis;

const ACCOUNT_XPUB =
  'b3f8aad750c8f498d2882d1ecd74bf550e81870e89acaed82e8e10ef5871887091286d601ecfe0aafc2121154db787bf489ccf35c6b5db5d60096052c8b34c2f';
const PREPROD: Cardano.ChainId = {
  networkId: 0 as Cardano.NetworkId,
  networkMagic: 1 as Cardano.NetworkMagic,
};

type WireAccount = WalletInfo['cardanoAccounts'][number];

const account = (over: Partial<WireAccount> = {}): WireAccount => ({
  accountIndex: 0,
  xpub: ACCOUNT_XPUB,
  networkMagic: 1,
  networkId: 0,
  name: 'Account 1',
  ...over,
});

const wallet = (over: Partial<WalletInfo> = {}): WalletInfo => ({
  walletId: 'w1',
  name: 'Wallet 1',
  cardanoAccounts: [account()],
  bitcoinAccounts: [],
  order: 0,
  type: 'InMemory',
  ...over,
});

const okWallets =
  (...wallets: WalletInfo[]) =>
  async (): Promise<LaceResult<WalletInfo[]>> => ({ ok: true, value: wallets });

const okAddresses =
  (...rewardAccounts: string[]) =>
  async (): Promise<LaceResult<{ rewardAccounts: string[] }>> => ({
    ok: true,
    value: { rewardAccounts },
  });

describe('WalletResolver', () => {
  let crypto: ConstructorParameters<typeof Bip32Account>[1];
  let rewardAccount: string;
  let secondRewardAccount: string;

  beforeAll(async () => {
    crypto = await Bip32Account.createDefaultDependencies();
    const bip32 = new Bip32Account(
      {
        extendedAccountPublicKey: ACCOUNT_XPUB as never,
        chainId: PREPROD,
        accountIndex: 0,
      },
      crypto,
    );
    const rewardAccountOfStakeKey = async (stakeIndex: number) =>
      String(
        (
          await bip32.deriveAddress(
            { type: AddressType.External, index: 0 },
            stakeIndex,
          )
        ).rewardAccount,
      );
    rewardAccount = await rewardAccountOfStakeKey(0);
    secondRewardAccount = await rewardAccountOfStakeKey(1);
  });

  it('resolves the (walletId, accountIndex) pair from an xpub', async () => {
    const resolver = new WalletResolver(
      okWallets(wallet()),
      okAddresses(),
      crypto,
    );
    expect(await resolver.accountForXpub(ACCOUNT_XPUB, PREPROD)).toEqual({
      walletId: 'w1',
      accountIndex: 0,
    });
    expect(await resolver.accountForXpub('deadbeef', PREPROD)).toBeUndefined();
  });

  it('resolves a non-0 account from its own xpub', async () => {
    const other = 'ff'.repeat(64);
    const resolver = new WalletResolver(
      okWallets(
        wallet({
          cardanoAccounts: [
            account(),
            account({ accountIndex: 1, xpub: other, name: 'Account 2' }),
          ],
        }),
      ),
      okAddresses(),
      crypto,
    );
    expect(await resolver.accountForXpub(other, PREPROD)).toEqual({
      walletId: 'w1',
      accountIndex: 1,
    });
  });

  it('resolves the primary reward account off the xpub when the host has discovered none yet', async () => {
    const resolver = new WalletResolver(
      okWallets(wallet()),
      okAddresses(),
      crypto,
    );
    expect(
      await resolver.accountForRewardAccount(rewardAccount, PREPROD),
    ).toEqual({ walletId: 'w1', accountIndex: 0, primary: true });
  });

  it('resolves EVERY reward account the host discovered, second stake key included', async () => {
    const resolver = new WalletResolver(
      okWallets(wallet()),
      okAddresses(rewardAccount, secondRewardAccount),
      crypto,
    );
    expect(
      await resolver.accountForRewardAccount(rewardAccount, PREPROD),
    ).toEqual({ walletId: 'w1', accountIndex: 0, primary: true });
    expect(
      await resolver.accountForRewardAccount(secondRewardAccount, PREPROD),
    ).toEqual({ walletId: 'w1', accountIndex: 0, primary: false });
  });

  it('rebuilds on a miss, so a stake key discovered later self-heals', async () => {
    let discovered: string[] = [rewardAccount];
    const resolver = new WalletResolver(
      okWallets(wallet()),
      async () => ({ ok: true, value: { rewardAccounts: discovered } }),
      crypto,
    );
    expect(
      await resolver.accountForRewardAccount(secondRewardAccount, PREPROD),
    ).toBeUndefined();
    discovered = [rewardAccount, secondRewardAccount];
    expect(
      await resolver.accountForRewardAccount(secondRewardAccount, PREPROD),
    ).toEqual({ walletId: 'w1', accountIndex: 0, primary: false });
  });

  it('keeps the xpub-derived primary when the host address read fails', async () => {
    const resolver = new WalletResolver(
      okWallets(wallet()),
      async () => ({ ok: false, error: { code: 'timeout', message: 'nope' } }),
      crypto,
    );
    expect(
      await resolver.accountForRewardAccount(rewardAccount, PREPROD),
    ).toEqual({ walletId: 'w1', accountIndex: 0, primary: true });
  });

  it('skips accountless (MultiSig / non-Cardano) wallets', async () => {
    const resolver = new WalletResolver(
      okWallets(wallet({ walletId: 'ms', cardanoAccounts: [] })),
      okAddresses(),
      crypto,
    );
    expect(await resolver.accountForXpub('', PREPROD)).toBeUndefined();
  });
});
