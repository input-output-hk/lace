// The maestroConfig augmentation lives on src/index.ts's import graph; the unit
// test reaches src/store/dependencies.ts directly, so load it explicitly.
import '../src/augmentations';

import { BitcoinNetwork } from '@lace-contract/bitcoin-context';
import { firstValueFrom } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { getBitcoinUtxos, submitBitcoinTx } from '../src/lace-client';
import { initializeDependencies } from '../src/store/dependencies';
import { BitcoinWalletResolver } from '../src/wallet-resolver';

import { bitcoinAccount, MAINNET_ADDRESS } from './fixtures';

import type {
  ModuleInitDependencies,
  ModuleInitProps,
} from '@lace-contract/module';
import type { AnyAccount } from '@lace-contract/wallet-repo';

// vi.mock is hoisted above the imports, so the lace-client import resolves to
// these stubs — the host wire never runs in unit tests.
vi.mock('../src/lace-client', () => ({
  getBitcoinUtxos: vi.fn(),
  submitBitcoinTx: vi.fn(),
}));

const logger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};
// maestroConfig is empty: the composite's host-owned methods never touch it (the
// free-running maestro legs, which do, are not exercised here).
const props = {
  runtime: { config: { bitcoinProvider: { maestroConfig: {} } } },
} as unknown as ModuleInitProps;
const deps = { logger } as unknown as ModuleInitDependencies;

const makeProvider = async (accounts: AnyAccount[] = [bitcoinAccount({})]) => {
  const resolver = new BitcoinWalletResolver();
  resolver.setAccounts(accounts);
  return (await initializeDependencies(props, deps, resolver)).bitcoinProvider;
};

describe('composite bitcoinProvider.getUTxOs', () => {
  afterEach(() => vi.clearAllMocks());

  it('resolves the address, calls the host wire and maps the utxo set', async () => {
    vi.mocked(getBitcoinUtxos).mockResolvedValue({
      ok: true,
      value: {
        utxos: [
          {
            txId: 'b'.repeat(64),
            index: 0,
            satoshis: '250000',
            address: MAINNET_ADDRESS,
            script: '0014deadbeef',
            confirmations: 3,
            height: 100,
          },
        ],
      },
    });
    const provider = await makeProvider();
    const result = await firstValueFrom(
      provider.getUTxOs(
        { network: BitcoinNetwork.Mainnet },
        MAINNET_ADDRESS,
        {},
      ),
    );
    expect(getBitcoinUtxos).toHaveBeenCalledWith('w1', 0, 'mainnet');
    expect(result.isOk()).toBe(true);
    expect(result.unwrap()).toEqual({
      items: [
        {
          txId: 'b'.repeat(64),
          index: 0,
          satoshis: 250_000,
          address: MAINNET_ADDRESS,
          script: '0014deadbeef',
          confirmations: 3,
          height: 100,
          runes: [],
          inscriptions: [],
        },
      ],
      cursor: '',
    });
  });

  it('errors without calling the wire when the address resolves to no account', async () => {
    const provider = await makeProvider();
    const result = await firstValueFrom(
      provider.getUTxOs({ network: BitcoinNetwork.Mainnet }, 'bc1qnope', {}),
    );
    expect(result.isErr()).toBe(true);
    expect(getBitcoinUtxos).not.toHaveBeenCalled();
  });

  it('maps a host error to a ProviderError', async () => {
    vi.mocked(getBitcoinUtxos).mockResolvedValue({
      ok: false,
      error: { code: 'internal', message: 'boom' },
    });
    const provider = await makeProvider();
    const result = await firstValueFrom(
      provider.getUTxOs(
        { network: BitcoinNetwork.Mainnet },
        MAINNET_ADDRESS,
        {},
      ),
    );
    expect(result.isErr()).toBe(true);
  });
});

describe('composite bitcoinProvider.submitTransaction', () => {
  afterEach(() => vi.clearAllMocks());

  it('submits the raw tx with the context network and returns the txId', async () => {
    vi.mocked(submitBitcoinTx).mockResolvedValue({
      ok: true,
      value: { txId: 'txabc' },
    });
    const provider = await makeProvider();
    const result = await firstValueFrom(
      provider.submitTransaction(
        { network: BitcoinNetwork.Testnet },
        'deadbeef',
      ),
    );
    expect(submitBitcoinTx).toHaveBeenCalledWith('deadbeef', 'testnet4');
    expect(result.unwrap()).toBe('txabc');
  });

  it('maps a host submit error to a ProviderError', async () => {
    vi.mocked(submitBitcoinTx).mockResolvedValue({
      ok: false,
      error: { code: 'refused', message: 'nope' },
    });
    const provider = await makeProvider();
    const result = await firstValueFrom(
      provider.submitTransaction(
        { network: BitcoinNetwork.Mainnet },
        'deadbeef',
      ),
    );
    expect(result.isErr()).toBe(true);
  });
});
