import {
  AirGappedQrExchangeCancelledError,
  airGappedQrExchangeHook,
} from '@lace-contract/air-gapped-qr-exchange';
import { BitcoinUrType } from '@lace-lib/bitcoin-air-gapped-protocol';
import { HexBytes } from '@lace-lib/util';
import { firstValueFrom, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BitcoinKeystoneTransactionSigner } from '../../../src/bitcoin/signing/bitcoin-keystone-transaction-signer';

import type { BitcoinSignRequest } from '@lace-contract/bitcoin-context';
import type * as BitcoinProtocol from '@lace-lib/bitcoin-air-gapped-protocol';

const REQUEST_PSBT = new Uint8Array([0xaa, 0xbb]);
const STRIPPED_REQUEST_PSBT = new Uint8Array([0xee, 0xff]);
const SIGNED_PSBT_BYTES = new Uint8Array([0xcc, 0xdd]);
const SIGNED_CBOR = new Uint8Array([1, 2, 3]);
const SIGNED_TX_HEX = '0200000001signed';

interface Bip32Derivation {
  masterFingerprint: Buffer;
  pubkey: Buffer;
  path: string;
}
interface InputUpdate {
  bip32Derivation: Bip32Derivation[];
}
interface PsbtInputData {
  witnessUtxo?: unknown;
  nonWitnessUtxo?: Uint8Array;
}

const updateInput = vi.hoisted(() =>
  vi.fn<(index: number, update: unknown) => void>(),
);
const finalizeAllInputs = vi.hoisted(() => vi.fn());
const combine = vi.hoisted(() => vi.fn());
const toBuffer = vi.hoisted(() => vi.fn(() => REQUEST_PSBT));
const psbtFromHex = vi.hoisted(() => vi.fn());
const psbtFromBuffer = vi.hoisted(() => vi.fn());

vi.mock('bitcoinjs-lib', () => ({
  Psbt: { fromHex: psbtFromHex, fromBuffer: psbtFromBuffer },
}));

const encodeSignRequest = vi.hoisted(() => vi.fn());
const parseSignResponse = vi.hoisted(() => vi.fn());
vi.mock('@lace-lib/bitcoin-air-gapped-protocol', async importOriginal => {
  const actual = await importOriginal<typeof BitcoinProtocol>();
  return { ...actual, encodeSignRequest, parseSignResponse };
});

const triggerSpy = vi.spyOn(airGappedQrExchangeHook, 'trigger');

const signers = [
  {
    publicKeyHex: '02'.padEnd(66, '0'),
    addressType: 'NativeSegWit',
    account: 0,
    chain: 'external',
    index: 0,
    network: 'mainnet',
  },
  {
    publicKeyHex: '03'.padEnd(66, '0'),
    addressType: 'NativeSegWit',
    account: 0,
    chain: 'internal',
    index: 5,
    network: 'mainnet',
  },
];

const stamped = (call: number): Bip32Derivation =>
  (updateInput.mock.calls[call][1] as InputUpdate).bip32Derivation[0];

const request = (
  overrides: Partial<{ signers: unknown[]; network: string }> = {},
): BitcoinSignRequest => ({
  serializedTx: HexBytes.fromUTF8(
    JSON.stringify({
      context: 'psbt-hex',
      network: overrides.network ?? 'mainnet',
      signers: overrides.signers ?? signers,
    }),
  ),
});

describe('BitcoinKeystoneTransactionSigner', () => {
  let localInputs: PsbtInputData[];
  let qrClone: {
    data: { inputs: PsbtInputData[] };
    toBuffer: () => Uint8Array;
  };
  let signedPsbt: { txInputs: unknown[] };

  beforeEach(() => {
    updateInput.mockReset();
    finalizeAllInputs.mockReset();
    combine.mockReset();
    toBuffer.mockReset().mockReturnValue(REQUEST_PSBT);
    localInputs = [
      { witnessUtxo: {}, nonWitnessUtxo: new Uint8Array([0x01]) },
      { witnessUtxo: {}, nonWitnessUtxo: new Uint8Array([0x02]) },
    ];
    qrClone = {
      data: {
        inputs: [
          { witnessUtxo: {}, nonWitnessUtxo: new Uint8Array([0x01]) },
          { witnessUtxo: {}, nonWitnessUtxo: new Uint8Array([0x02]) },
        ],
      },
      toBuffer: () => STRIPPED_REQUEST_PSBT,
    };
    signedPsbt = { txInputs: [{}, {}] };
    psbtFromHex.mockReset().mockReturnValue({
      updateInput,
      toBuffer,
      combine,
      finalizeAllInputs,
      data: { inputs: localInputs },
      extractTransaction: () => ({ toHex: () => SIGNED_TX_HEX }),
    });
    psbtFromBuffer
      .mockReset()
      .mockImplementation(bytes =>
        bytes === REQUEST_PSBT ? qrClone : signedPsbt,
      );
    encodeSignRequest.mockReset().mockReturnValue({
      urType: BitcoinUrType.Psbt,
      cbor: REQUEST_PSBT,
    });
    parseSignResponse.mockReset().mockReturnValue(SIGNED_PSBT_BYTES);
    triggerSpy
      .mockReset()
      .mockReturnValue(of({ urType: BitcoinUrType.Psbt, cbor: SIGNED_CBOR }));
  });

  it('round-trips a PSBT exchange into a signed transaction result', async () => {
    const signer = new BitcoinKeystoneTransactionSigner({
      masterFingerprint: 'deadbeef',
    });

    const result = await firstValueFrom(signer.sign(request()));

    expect(parseSignResponse).toHaveBeenCalledWith(SIGNED_CBOR);
    expect(finalizeAllInputs).toHaveBeenCalledTimes(1);
    expect(JSON.parse(HexBytes.toUTF8(result.serializedTx))).toEqual({
      network: 'mainnet',
      hex: SIGNED_TX_HEX,
    });
  });

  it('runs a crypto-psbt exchange (request and expected response are crypto-psbt)', async () => {
    const signer = new BitcoinKeystoneTransactionSigner({
      masterFingerprint: 'deadbeef',
    });

    await firstValueFrom(signer.sign(request()));

    expect(encodeSignRequest).toHaveBeenCalledWith(STRIPPED_REQUEST_PSBT);
    expect(triggerSpy).toHaveBeenCalledWith({
      request: { urType: BitcoinUrType.Psbt, cbor: REQUEST_PSBT },
      expectedResponseType: BitcoinUrType.Psbt,
      chainType: 'Bitcoin',
    });
  });

  it('stamps each input key-origin with the device xfp and native-segwit path', async () => {
    const signer = new BitcoinKeystoneTransactionSigner({
      masterFingerprint: 'deadbeef',
    });

    await firstValueFrom(signer.sign(request()));

    expect(updateInput).toHaveBeenCalledTimes(2);
    const first = stamped(0);
    expect(updateInput.mock.calls[0][0]).toBe(0);
    expect(first.path).toBe("m/84'/0'/0'/0/0");
    expect(first.masterFingerprint).toEqual(Buffer.from('deadbeef', 'hex'));
    expect(first.pubkey).toEqual(Buffer.from(signers[0].publicKeyHex, 'hex'));

    expect(updateInput.mock.calls[1][0]).toBe(1);
    expect(stamped(1).path).toBe("m/84'/0'/0'/1/5");
  });

  it('uses the testnet coin type in the path for testnet inputs', async () => {
    const signer = new BitcoinKeystoneTransactionSigner({
      masterFingerprint: 'deadbeef',
    });

    await firstValueFrom(
      signer.sign(
        request({
          network: 'testnet4',
          signers: [{ ...signers[0], network: 'testnet4' }],
        }),
      ),
    );

    expect(stamped(0).path).toBe("m/84'/1'/0'/0/0");
  });

  it('combines the device response into the request PSBT before finalizing', async () => {
    const signer = new BitcoinKeystoneTransactionSigner({
      masterFingerprint: 'deadbeef',
    });

    await firstValueFrom(signer.sign(request()));

    expect(psbtFromBuffer).toHaveBeenCalledWith(Buffer.from(SIGNED_PSBT_BYTES));
    expect(combine).toHaveBeenCalledWith(signedPsbt);
    expect(combine.mock.invocationCallOrder[0]).toBeLessThan(
      finalizeAllInputs.mock.invocationCallOrder[0],
    );
  });

  it('does not mutate the PSBT beyond stamping key-origins (no signing, no truncation)', async () => {
    const signer = new BitcoinKeystoneTransactionSigner({
      masterFingerprint: 'deadbeef',
    });

    await firstValueFrom(signer.sign(request()));

    const requestPsbt = psbtFromHex.mock.results[0].value as Record<
      string,
      unknown
    >;
    expect(Object.keys(requestPsbt)).not.toContain('signInput');
    expect(Object.keys(requestPsbt)).not.toContain('signAllInputs');
    expect(finalizeAllInputs).toHaveBeenCalledTimes(1);
  });

  it('propagates a cancel from the exchange', async () => {
    triggerSpy.mockReturnValue(
      throwError(() => new AirGappedQrExchangeCancelledError()),
    );
    const signer = new BitcoinKeystoneTransactionSigner({
      masterFingerprint: 'deadbeef',
    });

    await expect(firstValueFrom(signer.sign(request()))).rejects.toThrow(
      AirGappedQrExchangeCancelledError,
    );
  });

  it('strips nonWitnessUtxo from the QR request PSBT but keeps it on the local PSBT', async () => {
    const signer = new BitcoinKeystoneTransactionSigner({
      masterFingerprint: 'deadbeef',
    });

    await firstValueFrom(signer.sign(request()));

    expect(psbtFromBuffer).toHaveBeenCalledWith(REQUEST_PSBT);
    for (const input of qrClone.data.inputs) {
      expect(input.nonWitnessUtxo).toBeUndefined();
      expect(input.witnessUtxo).toBeDefined();
    }
    for (const input of localInputs) {
      expect(input.nonWitnessUtxo).toBeDefined();
    }
    expect(encodeSignRequest).toHaveBeenCalledWith(STRIPPED_REQUEST_PSBT);
  });

  it('throws when the device returns a PSBT with no inputs', async () => {
    signedPsbt = { txInputs: [] };
    const signer = new BitcoinKeystoneTransactionSigner({
      masterFingerprint: 'deadbeef',
    });

    await expect(firstValueFrom(signer.sign(request()))).rejects.toThrow(
      'no inputs',
    );
  });

  it('stamps an all-zero fingerprint when the device xfp is absent', async () => {
    const signer = new BitcoinKeystoneTransactionSigner({});

    await firstValueFrom(signer.sign(request()));

    expect(stamped(0).masterFingerprint).toEqual(Buffer.alloc(4));
  });
});
