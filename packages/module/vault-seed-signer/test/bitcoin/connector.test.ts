import { airGappedQrExchangeHook } from '@lace-contract/air-gapped-qr-exchange';
import {
  MULTISIG_NOT_SUPPORTED_CODE,
  MultisigNotSupportedError,
  WRONG_SCRIPT_TYPE_CODE,
  WrongScriptTypeError,
} from '@lace-lib/bitcoin-air-gapped-protocol';
import { WRONG_DEVICE_CODE } from '@lace-lib/util-hw';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import loadHwWalletConnector from '../../src/bitcoin/connector';

import type { BitcoinBip32AccountProps } from '@lace-contract/bitcoin-context';
import type * as SeedSignerProtocol from '@lace-lib/bitcoin-air-gapped-protocol';
import type { DecodedHdKey } from '@lace-lib/bitcoin-air-gapped-protocol';

const btcSpecific = (account: {
  blockchainSpecific: unknown;
}): BitcoinBip32AccountProps =>
  account.blockchainSpecific as BitcoinBip32AccountProps;

const decodeAccountExport = vi.hoisted(() => vi.fn());
vi.mock('@lace-lib/bitcoin-air-gapped-protocol', async importOriginal => {
  const actual = await importOriginal<typeof SeedSignerProtocol>();
  return { ...actual, decodeAccountExport };
});

const RESPONSE_CBOR = new Uint8Array([1, 2, 3]);
const triggerSpy = vi.spyOn(airGappedQrExchangeHook, 'trigger');

const decoded = (overrides: Partial<DecodedHdKey> = {}): DecodedHdKey => ({
  xpubBase58: 'xpub-native',
  originPath: [
    { index: 84, hardened: true },
    { index: 0, hardened: true },
    { index: 0, hardened: true },
  ],
  purpose: 84,
  coinType: 0,
  account: 0,
  sourceFingerprintHex: 'deadbeef',
  scriptType: 'NativeSegWit',
  ...overrides,
});

const loadModules = vi.fn();
const getConnector = async () =>
  loadHwWalletConnector({ loadModules } as never, {} as never);

const baseProps = {
  blockchainName: 'Bitcoin' as const,
  accountIndex: 0,
};

describe('bitcoin seed signer connector', () => {
  beforeEach(() => {
    triggerSpy.mockReset();
    decodeAccountExport.mockReset();
    triggerSpy.mockReturnValue(
      of({ urType: 'crypto-hdkey', cbor: RESPONSE_CBOR }),
    );
  });

  it('imports a native-segwit account as a watch-only mainnet wallet keyed by xfp', async () => {
    decodeAccountExport.mockReturnValue(decoded());

    const wallet = await (
      await getConnector()
    ).createWallet({} as never, baseProps as never);

    expect(wallet.walletId).toBe('seed-signer-deadbeef');
    expect(wallet.type).toBe('HardwareSeedSigner');
    expect(wallet.accounts).toHaveLength(1);
    const account = wallet.accounts[0];
    expect(account.blockchainName).toBe('Bitcoin');
    expect(account.networkType).toBe('mainnet');
    expect(btcSpecific(account).extendedAccountPublicKeys).toEqual({
      nativeSegWit: 'xpub-native',
    });
    expect(btcSpecific(account).masterFingerprint).toBe('deadbeef');
    expect(btcSpecific(account).accountIndex).toBe(0);
  });

  it('infers testnet from coin type 1', async () => {
    decodeAccountExport.mockReturnValue(
      decoded({
        coinType: 1,
        originPath: [
          { index: 84, hardened: true },
          { index: 1, hardened: true },
          { index: 0, hardened: true },
        ],
      }),
    );

    const wallet = await (
      await getConnector()
    ).createWallet({} as never, baseProps as never);

    expect(wallet.accounts[0].networkType).toBe('testnet');
  });

  it('rejects an export with an unexpected SLIP-44 coin type', async () => {
    decodeAccountExport.mockReturnValue(
      decoded({
        coinType: 2,
        originPath: [
          { index: 84, hardened: true },
          { index: 2, hardened: true },
          { index: 0, hardened: true },
        ],
      }),
    );

    await expect(
      (await getConnector()).createWallet({} as never, baseProps as never),
    ).rejects.toThrow('Unsupported SLIP-44 coin type in account export: 2');
  });

  it('runs a scan-only exchange (no request frames) accepting crypto-hdkey or crypto-account', async () => {
    decodeAccountExport.mockReturnValue(decoded());

    await (await getConnector()).createWallet({} as never, baseProps as never);

    const options = triggerSpy.mock.calls[0][0];
    expect(options.expectedResponseType).toEqual([
      'crypto-hdkey',
      'crypto-account',
    ]);
    expect(options.request).toEqual({ frames: [] });
  });

  it('decodes the reassembled response by its urType and cbor', async () => {
    decodeAccountExport.mockReturnValue(decoded());

    await (await getConnector()).createWallet({} as never, baseProps as never);

    expect(decodeAccountExport).toHaveBeenCalledWith({
      urType: 'crypto-hdkey',
      cbor: RESPONSE_CBOR,
    });
  });

  it('imports a crypto-account (Sparrow) export end-to-end, building the wallet', async () => {
    triggerSpy.mockReturnValue(
      of({ urType: 'crypto-account', cbor: RESPONSE_CBOR }),
    );
    decodeAccountExport.mockReturnValue(decoded());

    const wallet = await (
      await getConnector()
    ).createWallet({} as never, baseProps as never);

    expect(decodeAccountExport).toHaveBeenCalledWith({
      urType: 'crypto-account',
      cbor: RESPONSE_CBOR,
    });
    expect(wallet.walletId).toBe('seed-signer-deadbeef');
    expect(wallet.accounts).toHaveLength(1);
    expect(btcSpecific(wallet.accounts[0]).extendedAccountPublicKeys).toEqual({
      nativeSegWit: 'xpub-native',
    });
  });

  it('accepts a non-zero account index read from the export', async () => {
    decodeAccountExport.mockReturnValue(
      decoded({
        account: 3,
        originPath: [
          { index: 84, hardened: true },
          { index: 0, hardened: true },
          { index: 3, hardened: true },
        ],
      }),
    );

    const wallet = await (
      await getConnector()
    ).createWallet({} as never, baseProps as never);

    expect(btcSpecific(wallet.accounts[0]).accountIndex).toBe(3);
  });

  it('propagates the wrong-script-type domain error (unwrapped) for a non native-segwit export', async () => {
    decodeAccountExport.mockReturnValue(
      decoded({ purpose: 86, scriptType: 'Taproot' }),
    );

    await expect(
      (await getConnector()).createWallet({} as never, baseProps as never),
    ).rejects.toMatchObject({ code: WRONG_SCRIPT_TYPE_CODE });
  });

  it('propagates the multisig domain error (unwrapped)', async () => {
    decodeAccountExport.mockImplementation(() => {
      throw new MultisigNotSupportedError();
    });

    await expect(
      (await getConnector()).createWallet({} as never, baseProps as never),
    ).rejects.toMatchObject({ code: MULTISIG_NOT_SUPPORTED_CODE });
  });

  it('propagates the wrong-script-type error code thrown from decode', async () => {
    decodeAccountExport.mockImplementation(() => {
      throw new WrongScriptTypeError();
    });

    await expect(
      (await getConnector()).createWallet({} as never, baseProps as never),
    ).rejects.toMatchObject({ code: WRONG_SCRIPT_TYPE_CODE });
    expect(WRONG_SCRIPT_TYPE_CODE).toBe('SEED_SIGNER_WRONG_SCRIPT_TYPE');
    expect(MULTISIG_NOT_SUPPORTED_CODE).toBe(
      'SEED_SIGNER_MULTISIG_NOT_SUPPORTED',
    );
  });

  it('connectAccount attaches a network-specific account to the given walletId', async () => {
    decodeAccountExport.mockReturnValue(decoded());

    const accounts = await (
      await getConnector()
    ).connectAccount(
      {} as never,
      {
        walletId: 'seed-signer-deadbeef',
        blockchainName: 'Bitcoin',
        accountIndex: 0,
        accountName: 'Bitcoin Account',
        targetNetworks: new Set(),
      } as never,
    );

    expect(accounts).toHaveLength(1);
    expect(accounts[0].walletId).toBe('seed-signer-deadbeef');
    expect(accounts[0].metadata.name).toBe('Bitcoin Account');
  });

  it('connectAccount rejects an export scanned from a different device than the wallet', async () => {
    decodeAccountExport.mockReturnValue(
      decoded({ sourceFingerprintHex: 'cafebabe' }),
    );

    await expect(
      (
        await getConnector()
      ).connectAccount(
        {} as never,
        {
          walletId: 'seed-signer-deadbeef',
          blockchainName: 'Bitcoin',
          accountIndex: 0,
          accountName: 'Bitcoin Account',
          targetNetworks: new Set(),
        } as never,
      ),
    ).rejects.toMatchObject({ code: WRONG_DEVICE_CODE });
  });

  it('rejects a non-Bitcoin blockchain', async () => {
    await expect(
      (
        await getConnector()
      ).createWallet(
        {} as never,
        {
          ...baseProps,
          blockchainName: 'Cardano',
        } as never,
      ),
    ).rejects.toThrow(/only supports Bitcoin/);
  });
});
