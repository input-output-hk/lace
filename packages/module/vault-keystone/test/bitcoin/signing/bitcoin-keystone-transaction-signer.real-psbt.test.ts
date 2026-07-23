import * as ecc from '@bitcoinerlab/secp256k1';
import { airGappedQrExchangeHook } from '@lace-contract/air-gapped-qr-exchange';
import {
  BitcoinUrType,
  encodeCryptoPsbt,
  parseSignResponse,
} from '@lace-lib/bitcoin-air-gapped-protocol';
import { HexBytes } from '@lace-lib/util';
import * as bitcoin from 'bitcoinjs-lib';
import { ECPairFactory } from 'ecpair';
import { firstValueFrom, Observable } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { BitcoinKeystoneTransactionSigner } from '../../../src/bitcoin/signing/bitcoin-keystone-transaction-signer';

import type { AirGappedQrExchangeResult } from '@lace-contract/air-gapped-qr-exchange';

bitcoin.initEccLib(ecc);
const ECPair = ECPairFactory(ecc);

const NETWORK = bitcoin.networks.bitcoin;
const XFP_HEX = 'deadbeef';

interface Bip32Derivation {
  masterFingerprint: Buffer;
  pubkey: Buffer;
  path: string;
}

/**
 * Builds a real single-input P2WPKH PSBT carrying both witnessUtxo and the
 * full previous transaction as nonWitnessUtxo (matching the builder output
 * for hardware accounts) plus the matching unsigned-tx DTO the signer
 * consumes, and returns the key pair so the stubbed device can sign the
 * exact PSBT bytes the signer sends.
 */
const buildUnsignedTxDto = (): {
  serializedTx: HexBytes;
  keyPair: ReturnType<typeof ECPair.makeRandom>;
  publicKeyHex: string;
} => {
  const keyPair = ECPair.makeRandom();
  const pubkey = Buffer.from(keyPair.publicKey);
  const payment = bitcoin.payments.p2wpkh({ pubkey, network: NETWORK });

  const previousTx = new bitcoin.Transaction();
  previousTx.addInput(Buffer.alloc(32), 0);
  previousTx.addOutput(payment.output!, 100_000);

  const psbt = new bitcoin.Psbt({ network: NETWORK });
  psbt.addInput({
    hash: previousTx.getId(),
    index: 0,
    witnessUtxo: { script: payment.output!, value: 100_000 },
    nonWitnessUtxo: previousTx.toBuffer(),
  });
  psbt.addOutput({ address: payment.address!, value: 90_000 });

  const dto = {
    context: psbt.toHex(),
    network: 'mainnet',
    signers: [
      {
        publicKeyHex: pubkey.toString('hex'),
        addressType: 'NativeSegWit',
        account: 0,
        chain: 'external',
        index: 0,
        network: 'mainnet',
      },
    ],
  };

  return {
    serializedTx: HexBytes.fromUTF8(JSON.stringify(dto)),
    keyPair,
    publicKeyHex: pubkey.toString('hex'),
  };
};

/**
 * Reduces a signed PSBT to the minimal response shape a Keystone may return:
 * the unsigned transaction plus only the partial signatures, with
 * witnessUtxo, scripts and key-origins stripped.
 */
const toMinimalSignedPsbt = (signed: bitcoin.Psbt): bitcoin.Psbt => {
  const minimal = bitcoin.Psbt.fromBuffer(signed.toBuffer());
  minimal.data.inputs.forEach(input => {
    delete input.witnessUtxo;
    delete input.nonWitnessUtxo;
    delete input.bip32Derivation;
    delete input.redeemScript;
    delete input.witnessScript;
  });
  return minimal;
};

/**
 * Stands in for the air-gapped Keystone: parses the crypto-psbt request the
 * signer sends, signs every input with the supplied key WITHOUT finalizing,
 * and returns the signed PSBT as a crypto-psbt response. With minimalResponse
 * the reply carries only the signatures, mimicking a device that strips the
 * PSBT down. Records the request PSBT so the test can inspect the key-origins
 * the signer stamped.
 */
const installSigningDeviceStub = (
  keyPair: ReturnType<typeof ECPair.makeRandom>,
  options: { minimalResponse?: boolean } = {},
): { restore: () => void; requestPsbt: () => bitcoin.Psbt } => {
  const original = airGappedQrExchangeHook.trigger;
  let captured: bitcoin.Psbt | undefined;

  airGappedQrExchangeHook.trigger = exchangeOptions =>
    new Observable<AirGappedQrExchangeResult>(subscriber => {
      const requestCbor = (exchangeOptions.request as { cbor: Uint8Array })
        .cbor;
      const requestPsbtBytes = parseSignResponse(requestCbor);
      const psbt = bitcoin.Psbt.fromBuffer(Buffer.from(requestPsbtBytes));
      captured = bitcoin.Psbt.fromBuffer(Buffer.from(requestPsbtBytes));

      const signer = {
        publicKey: Buffer.from(keyPair.publicKey),
        sign: (hash: Buffer) => Buffer.from(keyPair.sign(hash)),
      };
      psbt.signAllInputs(signer);
      const response =
        options.minimalResponse === true ? toMinimalSignedPsbt(psbt) : psbt;

      subscriber.next({
        urType: BitcoinUrType.Psbt,
        cbor: encodeCryptoPsbt(response.toBuffer()),
      });
      subscriber.complete();
    });

  return {
    restore: () => {
      airGappedQrExchangeHook.trigger = original;
    },
    requestPsbt: () => {
      if (!captured) throw new Error('device stub captured no request PSBT');
      return captured;
    },
  };
};

const parsedResult = async (
  serializedTx: HexBytes,
): Promise<{ network: string; hex: string }> => {
  const signer = new BitcoinKeystoneTransactionSigner({
    masterFingerprint: XFP_HEX,
  });
  const result = await firstValueFrom(signer.sign({ serializedTx }));
  return JSON.parse(HexBytes.toUTF8(result.serializedTx)) as {
    network: string;
    hex: string;
  };
};

describe('BitcoinKeystoneTransactionSigner real-PSBT round trip', () => {
  let stub: ReturnType<typeof installSigningDeviceStub>;
  let dto: ReturnType<typeof buildUnsignedTxDto>;

  afterEach(() => {
    stub.restore();
  });

  describe('signed but not finalized device response', () => {
    beforeEach(() => {
      dto = buildUnsignedTxDto();
      stub = installSigningDeviceStub(dto.keyPair);
    });

    it('stamps real bip32Derivation (xfp + native-segwit path) on the request PSBT', async () => {
      await parsedResult(dto.serializedTx);

      const input = stub.requestPsbt().data.inputs[0];
      const derivation = input.bip32Derivation?.[0] as
        | Bip32Derivation
        | undefined;
      expect(derivation).toBeDefined();
      expect(derivation!.masterFingerprint).toEqual(
        Buffer.from(XFP_HEX, 'hex'),
      );
      expect(derivation!.pubkey.toString('hex')).toBe(dto.publicKeyHex);
      expect(derivation!.path).toBe("m/84'/0'/0'/0/0");
    });

    it('strips nonWitnessUtxo from the QR request while keeping witnessUtxo and key-origins', async () => {
      await parsedResult(dto.serializedTx);

      const input = stub.requestPsbt().data.inputs[0];
      expect(input.nonWitnessUtxo).toBeUndefined();
      expect(input.witnessUtxo).toBeDefined();
      expect(input.bip32Derivation).toBeDefined();
    });

    it('finalizes and extracts a real signed transaction hex', async () => {
      const parsed = await parsedResult(dto.serializedTx);

      expect(parsed.network).toBe('mainnet');
      expect(parsed.hex.length).toBeGreaterThan(0);
      const tx = bitcoin.Transaction.fromHex(parsed.hex);
      expect(tx.ins).toHaveLength(1);
      expect(tx.ins[0].witness.length).toBeGreaterThan(0);
    });
  });

  describe('minimal device response (signatures only)', () => {
    beforeEach(() => {
      dto = buildUnsignedTxDto();
      stub = installSigningDeviceStub(dto.keyPair, { minimalResponse: true });
    });

    it('restores witnessUtxo from the request PSBT and still finalizes', async () => {
      const parsed = await parsedResult(dto.serializedTx);

      expect(parsed.network).toBe('mainnet');
      const tx = bitcoin.Transaction.fromHex(parsed.hex);
      expect(tx.ins).toHaveLength(1);
      expect(tx.ins[0].witness.length).toBeGreaterThan(0);
    });
  });
});
