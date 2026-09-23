import {
  CardanoInMemoryTransactionSigner,
  createInputResolver,
} from '@lace-contract/cardano-context';
import { expectCollateralGuardRefusesCaseB } from '@lace-lib/util-dev-cardano';
import { describe, expect, it, vi } from 'vitest';

import { CardanoLazyInMemorySignerFactory } from '../src/cardano-lazy-in-memory-signer-factory';

import type { Cardano } from '@cardano-sdk/core';
import type { GroupedAddress } from '@cardano-sdk/key-management';
import type { CardanoTransactionSignerContext } from '@lace-contract/cardano-context';
import type {
  AccountId,
  AnyAccount,
  AnyWallet,
  WalletId,
} from '@lace-contract/wallet-repo';

// This is the 7th Cardano signer factory (operator-approved widening,
// 2026-09-04) and has no other test coverage of any kind in this repo --
// this file is the minimal test infra + the single guard-wrapping probe.
// Minimal on purpose: an app with no existing test suite should not gain a
// broad one as a side effect of one guard-wiring probe.

const accountId = 'wallet-1-0-1' as AccountId;

const lazyAccount = {
  accountId,
  accountType: 'LazyInMemory',
  blockchainName: 'Cardano',
  blockchainSpecific: {
    accountIndex: 0,
    chainId: { networkId: 0, networkMagic: 1 },
    extendedAccountPublicKey: '0'.repeat(128),
  },
} as unknown as AnyAccount;

const wallet = {
  walletId: 'wallet-1' as WalletId,
  accounts: [lazyAccount],
} as unknown as AnyWallet;

const buildContext = (
  overrides: Partial<CardanoTransactionSignerContext> = {},
): CardanoTransactionSignerContext => ({
  wallet,
  accountId,
  knownAddresses: [] as GroupedAddress[],
  utxo: [] as Cardano.Utxo[],
  collateralInputResolver: createInputResolver([]),
  auth: { authenticate: () => undefined } as never,
  ...overrides,
});

describe('CardanoLazyInMemorySignerFactory', () => {
  const factory = new CardanoLazyInMemorySignerFactory({
    getMnemonicWords: vi.fn(),
  });

  it('canSign matches a Cardano LazyInMemory account', () => {
    expect(factory.canSign(lazyAccount)).toBe(true);
    expect(
      factory.canSign({
        ...lazyAccount,
        blockchainName: 'Bitcoin',
      } as unknown as AnyAccount),
    ).toBe(false);
  });

  it('builds a transaction signer for a supported account', () => {
    expect(typeof factory.createTransactionSigner(buildContext()).sign).toBe(
      'function',
    );
  });

  it('is wrapped by the collateral-ownership guard: a case-(b) transaction is refused and never reaches the inner signer', async () => {
    const innerSign = vi.spyOn(
      CardanoInMemoryTransactionSigner.prototype,
      'sign',
    );
    await expectCollateralGuardRefusesCaseB({
      createSigner: ownership =>
        factory.createTransactionSigner(buildContext(ownership)),
      assertNotDelegated: () => {
        expect(innerSign).not.toHaveBeenCalled();
      },
    });
    innerSign.mockRestore();
  });
});
