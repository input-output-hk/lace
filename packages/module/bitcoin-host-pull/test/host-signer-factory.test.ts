import {
  BitcoinNetwork,
  BitcoinNetworkId,
} from '@lace-contract/bitcoin-context';
import { AuthenticationCancelledError } from '@lace-contract/signer';
import { AccountId, WalletId, WalletType } from '@lace-contract/wallet-repo';
import { HexBytes } from '@lace-lib/util';
import { EMPTY, of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import initSignerFactory from '../src/exposed-modules/host-signer-factory';
import {
  getBitcoinSignTxResult,
  requestSignBitcoinTx,
} from '../src/lace-client';

import type {
  BitcoinSignResult,
  BitcoinSignerContext,
} from '@lace-contract/bitcoin-context';
import type { SignerAuth } from '@lace-contract/signer';
import type { AnyAccount, AnyWallet } from '@lace-contract/wallet-repo';

// vi.mock is hoisted above the imports, so the lace-client import resolves to
// these stubs.
vi.mock('../src/lace-client', () => ({
  requestSignBitcoinTx: vi.fn(),
  getBitcoinSignTxResult: vi.fn(),
}));

const PSBT_HEX = '70736274ff01deadbeef';
const SIGNED_HEX = '0200000000010112ab';

const account = (accountType: string, blockchainName: string) =>
  ({ accountType, blockchainName } as unknown as AnyAccount);

/** The executor's unsigned artifact shape (blockchain-bitcoin
 * common/transaction.ts SerializedDto): hex-of-UTF8 JSON with the PSBT under
 * `context`. Replicated literally (ADR 14: no cross-module import). */
const encodeUnsignedEnvelope = (network = 'testnet4') =>
  HexBytes.fromUTF8(
    JSON.stringify({
      context: PSBT_HEX,
      toAddress: 'tb1qexamplerecipient',
      amount: 1000,
      fee: 200,
      vBytes: 110,
      signers: [],
      network,
    }),
  );

/** A signing context whose account at `accountIndex` on `network` is the one
 * the factory is created for. The signer threads that (index, network) into the
 * host sign request; the network disambiguates the exact account (ADR 11). */
const txContext = (
  accountIndex = 0,
  network: BitcoinNetwork = BitcoinNetwork.Testnet,
): BitcoinSignerContext => {
  const accountId = AccountId(`w1-${accountIndex}-${network}`);
  const acct = {
    accountId,
    walletId: WalletId('w1'),
    blockchainName: 'Bitcoin',
    accountType: 'InMemory',
    blockchainNetworkId: BitcoinNetworkId(
      network === BitcoinNetwork.Mainnet ? 'mainnet' : 'testnet4',
    ),
    blockchainSpecific: { accountIndex },
  } as unknown as AnyAccount;
  const wallet = {
    walletId: WalletId('w1'),
    type: WalletType.InMemory,
    isPassphraseConfirmed: true,
    metadata: { name: 'W', order: 0 },
    blockchainSpecific: {},
    accounts: [acct],
  } as unknown as AnyWallet;
  return {
    wallet,
    accountId,
    auth: {
      authenticate: () => of(true),
      accessAuthSecret: () => EMPTY,
    } as SignerAuth,
  };
};

describe('HostBitcoinSignerFactory', () => {
  it('signs InMemory and host-paired hardware (Ledger, Trezor, Keystone, SeedSigner) Bitcoin accounts, nothing else', () => {
    const factory = initSignerFactory();
    // Bitcoin InMemory (host unseal ceremony) and Bitcoin HardwareLedger /
    // HardwareTrezor / HardwareKeystone / HardwareSeedSigner (host device
    // ceremony) all sign via the host (ADR 44).
    expect(factory.canSign(account('InMemory', 'Bitcoin'))).toBe(true);
    expect(factory.canSign(account('HardwareLedger', 'Bitcoin'))).toBe(true);
    expect(factory.canSign(account('HardwareTrezor', 'Bitcoin'))).toBe(true);
    expect(factory.canSign(account('HardwareKeystone', 'Bitcoin'))).toBe(true);
    expect(factory.canSign(account('HardwareSeedSigner', 'Bitcoin'))).toBe(
      true,
    );
    // Unknown hardware types are not host-signable in the guest loadout.
    expect(factory.canSign(account('MultiSig', 'Bitcoin'))).toBe(false);
    // Non-Bitcoin never signs here (Cardano/Midnight have their own signers).
    expect(factory.canSign(account('InMemory', 'Cardano'))).toBe(false);
    expect(factory.canSign(account('HardwareLedger', 'Cardano'))).toBe(false);
    expect(factory.canSign(account('HardwareKeystone', 'Cardano'))).toBe(false);
  });

  it('refuses data signing (host-owned, no guest consumer)', () => {
    const factory = initSignerFactory();
    expect(() => factory.createDataSigner(txContext())).toThrow('host-owned');
  });
});

describe('HostBitcoinTransactionSigner.sign', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    vi.mocked(requestSignBitcoinTx).mockResolvedValue({
      ok: true,
      value: { ceremonyId: 'c1', mounted: true },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('wraps the host-signed raw hex into the executor DTO after pending → pending → signed', async () => {
    vi.mocked(getBitcoinSignTxResult)
      .mockResolvedValueOnce({ ok: true, value: { status: 'pending' } })
      .mockResolvedValueOnce({ ok: true, value: { status: 'pending' } })
      .mockResolvedValueOnce({
        ok: true,
        value: { status: 'signed', signedTxHex: SIGNED_HEX },
      });

    const results: BitcoinSignResult[] = [];
    const errors: unknown[] = [];
    initSignerFactory()
      .createTransactionSigner(txContext())
      .sign({ serializedTx: encodeUnsignedEnvelope() })
      .subscribe({
        next: result => results.push(result),
        error: error => errors.push(error),
      });

    await vi.advanceTimersByTimeAsync(2500);

    expect(errors).toHaveLength(0);
    expect(results).toHaveLength(1);
    // The signed artifact is the SignedBitcoinTransactionDto submit-tx consumes
    // verbatim (JSON.parse(HexBytes.toUTF8(...)) → { network, hex }).
    expect(JSON.parse(HexBytes.toUTF8(results[0].serializedTx))).toEqual({
      network: 'testnet4',
      hex: SIGNED_HEX,
    });
    // Only the PSBT + (walletId, accountIndex, network) crossed the wire (D4).
    expect(requestSignBitcoinTx).toHaveBeenCalledWith({
      walletId: 'w1',
      accountIndex: 0,
      network: 'testnet4',
      psbtHex: PSBT_HEX,
    });
  });

  it('threads a NON-0 signing account index and its network into the host request', async () => {
    vi.mocked(getBitcoinSignTxResult).mockResolvedValue({
      ok: true,
      value: { status: 'cancelled' },
    });

    initSignerFactory()
      .createTransactionSigner(txContext(2, BitcoinNetwork.Mainnet))
      .sign({ serializedTx: encodeUnsignedEnvelope('mainnet') })
      .subscribe({ error: () => undefined });

    await vi.advanceTimersByTimeAsync(50);

    expect(requestSignBitcoinTx).toHaveBeenCalledWith({
      walletId: 'w1',
      accountIndex: 2,
      network: 'mainnet',
      psbtHex: PSBT_HEX,
    });
  });

  it('cancels when the host reports cancelled', async () => {
    vi.mocked(getBitcoinSignTxResult).mockResolvedValue({
      ok: true,
      value: { status: 'cancelled' },
    });

    const errors: unknown[] = [];
    initSignerFactory()
      .createTransactionSigner(txContext())
      .sign({ serializedTx: encodeUnsignedEnvelope() })
      .subscribe({ error: error => errors.push(error) });

    await vi.advanceTimersByTimeAsync(100);

    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(AuthenticationCancelledError);
  });

  it('cancels once the poll ceiling elapses with no terminal result', async () => {
    vi.mocked(getBitcoinSignTxResult).mockResolvedValue({
      ok: true,
      value: { status: 'pending' },
    });

    const errors: unknown[] = [];
    let isCompleted = false;
    initSignerFactory()
      .createTransactionSigner(txContext())
      .sign({ serializedTx: encodeUnsignedEnvelope() })
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
