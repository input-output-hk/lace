import { AuthenticationCancelledError } from '@lace-contract/signer';
import { AccountId, WalletId, WalletType } from '@lace-contract/wallet-repo';
import { HexBytes } from '@lace-lib/util';
import { EMPTY, of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import initSignerFactory from '../src/exposed-modules/host-signer-factory';
import {
  getCardanoSignTxResult,
  requestSignCardanoTx,
} from '../src/lace-client';

import {
  hostWitnessSetCbor,
  PK_HOST,
  SIG_HOST,
  unsignedTx,
} from './tx-fixtures';

import type {
  CardanoSignResult,
  CardanoTransactionSignerContext,
} from '@lace-contract/cardano-context';
import type { SignerAuth } from '@lace-contract/signer';
import type { AnyAccount, AnyWallet } from '@lace-contract/wallet-repo';

// vi.mock is hoisted above the imports above, so the lace-client import
// resolves to these stubs.
vi.mock('../src/lace-client', () => ({
  requestSignCardanoTx: vi.fn(),
  getCardanoSignTxResult: vi.fn(),
}));

const cardanoAccount = (accountType: string, blockchainName: string) =>
  ({ accountType, blockchainName } as unknown as AnyAccount);

/** A signing context for a wallet whose account at `accountIndex` is the one
 * the factory is created for (accountId is the ADR-13 composite the host wire
 * expects). The signer must thread THAT index into the host sign request. */
const txContext = (accountIndex = 0): CardanoTransactionSignerContext => {
  const accountId = AccountId(`w1-${accountIndex}-1`);
  const account = {
    accountId,
    walletId: WalletId('w1'),
    blockchainName: 'Cardano',
    accountType: 'InMemory',
    blockchainSpecific: {
      accountIndex,
      chainId: { networkId: 0, networkMagic: 1 },
    },
  } as unknown as AnyAccount;
  const wallet = {
    walletId: WalletId('w1'),
    type: WalletType.InMemory,
    isPassphraseConfirmed: true,
    metadata: { name: 'W', order: 0 },
    blockchainSpecific: {},
    accounts: [account],
  } as unknown as AnyWallet;
  return {
    wallet,
    accountId,
    knownAddresses: [],
    utxo: [],
    auth: {
      authenticate: () => of(true),
      accessAuthSecret: () => EMPTY,
    } as SignerAuth,
  };
};

describe('HostSignerFactory', () => {
  it('signs InMemory and host-paired hardware (Ledger, Trezor, Keystone, SeedSigner) Cardano accounts, nothing else', () => {
    const factory = initSignerFactory();
    // Cardano InMemory (host unseal ceremony) and Cardano HardwareLedger /
    // HardwareTrezor / HardwareKeystone / HardwareSeedSigner (host device
    // ceremony) all sign via the host (ADR 44).
    expect(factory.canSign(cardanoAccount('InMemory', 'Cardano'))).toBe(true);
    expect(factory.canSign(cardanoAccount('HardwareLedger', 'Cardano'))).toBe(
      true,
    );
    expect(factory.canSign(cardanoAccount('HardwareTrezor', 'Cardano'))).toBe(
      true,
    );
    expect(factory.canSign(cardanoAccount('HardwareKeystone', 'Cardano'))).toBe(
      true,
    );
    expect(
      factory.canSign(cardanoAccount('HardwareSeedSigner', 'Cardano')),
    ).toBe(true);
    // Non-Cardano never signs here (Bitcoin/Midnight have their own signers).
    expect(factory.canSign(cardanoAccount('InMemory', 'Bitcoin'))).toBe(false);
    expect(factory.canSign(cardanoAccount('HardwareLedger', 'Bitcoin'))).toBe(
      false,
    );
    expect(factory.canSign(cardanoAccount('HardwareKeystone', 'Bitcoin'))).toBe(
      false,
    );
    // Unknown account types are not host-signable in the guest.
    expect(factory.canSign(cardanoAccount('MultiSig', 'Cardano'))).toBe(false);
  });

  it('refuses data signing (host-owned, no guest consumer)', () => {
    const factory = initSignerFactory();
    expect(() => factory.createDataSigner(txContext())).toThrow('host-owned');
  });
});

describe('HostCardanoTransactionSigner.sign', () => {
  const serializedTx = HexBytes(unsignedTx([]));

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    vi.mocked(requestSignCardanoTx).mockResolvedValue({
      ok: true,
      value: { ceremonyId: 'c1', mounted: true },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves with the assembled tx after pending → pending → signed', async () => {
    vi.mocked(getCardanoSignTxResult)
      .mockResolvedValueOnce({ ok: true, value: { status: 'pending' } })
      .mockResolvedValueOnce({ ok: true, value: { status: 'pending' } })
      .mockResolvedValueOnce({
        ok: true,
        value: {
          status: 'signed',
          witnessCborHex: hostWitnessSetCbor([[PK_HOST, SIG_HOST]]),
        },
      });

    const results: CardanoSignResult[] = [];
    const errors: unknown[] = [];
    initSignerFactory()
      .createTransactionSigner(txContext())
      .sign({ serializedTx })
      .subscribe({
        next: result => results.push(result),
        error: error => errors.push(error),
      });

    await vi.advanceTimersByTimeAsync(2500);

    expect(errors).toHaveLength(0);
    expect(results).toHaveLength(1);
    expect(results[0].signatureCount).toBe(1);
    // The account's network-specific accountId threaded into the host request.
    expect(requestSignCardanoTx).toHaveBeenCalledWith(
      'w1-0-1',
      expect.any(String),
    );
  });

  it('threads a NON-0 signing account index from the context into the host request', async () => {
    vi.mocked(getCardanoSignTxResult).mockResolvedValue({
      ok: true,
      value: { status: 'cancelled' },
    });

    initSignerFactory()
      .createTransactionSigner(txContext(2))
      .sign({ serializedTx })
      .subscribe({ error: () => undefined });

    await vi.advanceTimersByTimeAsync(50);

    expect(requestSignCardanoTx).toHaveBeenCalledWith(
      'w1-2-1',
      expect.any(String),
    );
  });

  it('cancels when the host reports cancelled', async () => {
    vi.mocked(getCardanoSignTxResult).mockResolvedValue({
      ok: true,
      value: { status: 'cancelled' },
    });

    const errors: unknown[] = [];
    initSignerFactory()
      .createTransactionSigner(txContext())
      .sign({ serializedTx })
      .subscribe({ error: error => errors.push(error) });

    await vi.advanceTimersByTimeAsync(100);

    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(AuthenticationCancelledError);
  });

  it('cancels once the poll ceiling elapses with no terminal result', async () => {
    vi.mocked(getCardanoSignTxResult).mockResolvedValue({
      ok: true,
      value: { status: 'pending' },
    });

    const errors: unknown[] = [];
    let isCompleted = false;
    initSignerFactory()
      .createTransactionSigner(txContext())
      .sign({ serializedTx })
      .subscribe({
        error: error => errors.push(error),
        complete: () => {
          isCompleted = true;
        },
      });

    await vi.advanceTimersByTimeAsync(15 * 60 * 1000);

    expect(isCompleted).toBe(false);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(AuthenticationCancelledError);
  });
});
