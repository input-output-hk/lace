import * as ecc from '@bitcoinerlab/secp256k1';
import { BitcoinNetwork } from '@lace-contract/bitcoin-context';
import { WalletId } from '@lace-contract/wallet-repo';
import { HexBytes } from '@lace-lib/util';
import * as bitcoin from 'bitcoinjs-lib';
import { ECPairFactory } from 'ecpair';
import { firstValueFrom } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BitcoinLedgerTransactionSigner } from '../../../src/bitcoin/signing/bitcoin-ledger-transaction-signer';

import type {
  LedgerBitcoinSignPsbtProps,
  LedgerBitcoinTransport,
} from '../../../src/ledger-bitcoin-transport';

bitcoin.initEccLib(ecc);
const ECPair = ECPairFactory(ecc);

const NETWORK = bitcoin.networks.bitcoin;
const XFP_HEX = 'deadbeef';
const WALLET_ID = WalletId('usb-hw-11415-4117-abc123');

interface Bip32Derivation {
  masterFingerprint: Buffer;
  pubkey: Buffer;
  path: string;
}

/**
 * Builds a real P2WPKH PSBT (witnessUtxo only) with one distinct key per
 * input plus the matching unsigned-tx DTO the signer consumes, and returns
 * the key pairs so the stubbed device transport can produce real ECDSA
 * signatures over the correct sighashes.
 */
const buildUnsignedTxDto = (
  inputCount = 1,
): {
  serializedTx: HexBytes;
  unsignedPsbtHex: string;
  keyPairs: ReturnType<typeof ECPair.makeRandom>[];
  publicKeyHexes: string[];
} => {
  const keyPairs = Array.from({ length: inputCount }, () =>
    ECPair.makeRandom(),
  );
  const payments = keyPairs.map(keyPair =>
    bitcoin.payments.p2wpkh({
      pubkey: Buffer.from(keyPair.publicKey),
      network: NETWORK,
    }),
  );

  const psbt = new bitcoin.Psbt({ network: NETWORK });
  payments.forEach((payment, index) => {
    psbt.addInput({
      hash: Buffer.alloc(32, index + 1).toString('hex'),
      index: 0,
      witnessUtxo: { script: payment.output!, value: 100_000 },
    });
  });
  psbt.addOutput({ address: payments[0].address!, value: 90_000 });

  const dto = {
    context: psbt.toHex(),
    network: 'mainnet',
    signers: keyPairs.map((keyPair, index) => ({
      publicKeyHex: Buffer.from(keyPair.publicKey).toString('hex'),
      addressType: 'NativeSegWit',
      account: 0,
      chain: 'external',
      index,
      network: 'mainnet',
    })),
  };

  return {
    serializedTx: HexBytes.fromUTF8(JSON.stringify(dto)),
    unsignedPsbtHex: psbt.toHex(),
    keyPairs,
    publicKeyHexes: keyPairs.map(keyPair =>
      Buffer.from(keyPair.publicKey).toString('hex'),
    ),
  };
};

/**
 * Stands in for the Ledger device: parses the base64 PSBT the signer sends,
 * signs every input with the key matching its stamped bip32Derivation pubkey,
 * and yields per-input signature entries the way the AppClient does (bare
 * signatures, no PSBT). Records the received PSBT and policy props so the
 * test can inspect the key-origins the signer stamped.
 */
const makeSigningTransport = (
  keyPairs: ReturnType<typeof ECPair.makeRandom>[],
): {
  transport: LedgerBitcoinTransport;
  requestPsbt: () => bitcoin.Psbt;
  policyProps: () => LedgerBitcoinSignPsbtProps;
} => {
  let captured: bitcoin.Psbt | undefined;
  let capturedProps: LedgerBitcoinSignPsbtProps | undefined;

  const transport: LedgerBitcoinTransport = {
    getMasterFingerprint: vi.fn(),
    getExtendedPubkey: vi.fn(),
    signPsbt: async (_descriptor, props) => {
      capturedProps = props;
      captured = bitcoin.Psbt.fromBase64(props.psbtBase64);

      const psbt = bitcoin.Psbt.fromBase64(props.psbtBase64);
      psbt.data.inputs.forEach((input, inputIndex) => {
        const stampedPubkey = input.bip32Derivation?.[0]?.pubkey;
        const keyPair = keyPairs.find(candidate =>
          stampedPubkey?.equals(Buffer.from(candidate.publicKey)),
        );
        if (!keyPair) {
          throw new Error(`No key matches input ${inputIndex} key-origin`);
        }
        psbt.signInput(inputIndex, {
          publicKey: Buffer.from(keyPair.publicKey),
          sign: (hash: Buffer) => Buffer.from(keyPair.sign(hash)),
        });
      });
      return psbt.data.inputs.map((input, inputIndex) => ({
        inputIndex,
        pubkey: input.partialSig![0].pubkey,
        signature: input.partialSig![0].signature,
      }));
    },
  };

  return {
    transport,
    requestPsbt: () => {
      if (!captured) throw new Error('transport stub received no PSBT');
      return captured;
    },
    policyProps: () => {
      if (!capturedProps) throw new Error('transport stub received no props');
      return capturedProps;
    },
  };
};

const parsedResult = async (
  serializedTx: HexBytes,
  transport: LedgerBitcoinTransport,
): Promise<{ network: string; hex: string }> => {
  const signer = new BitcoinLedgerTransactionSigner(
    {
      masterFingerprint: XFP_HEX,
      accountIndex: 0,
      extendedPublicKey: 'xpub-native',
      network: BitcoinNetwork.Mainnet,
      walletId: WALLET_ID,
    },
    { transport },
  );
  const result = await firstValueFrom(signer.sign({ serializedTx }));
  return JSON.parse(HexBytes.toUTF8(result.serializedTx)) as {
    network: string;
    hex: string;
  };
};

describe('BitcoinLedgerTransactionSigner real-PSBT round trip', () => {
  let stub: ReturnType<typeof makeSigningTransport>;
  let dto: ReturnType<typeof buildUnsignedTxDto>;

  beforeEach(() => {
    dto = buildUnsignedTxDto();
    stub = makeSigningTransport(dto.keyPairs);
  });

  it('stamps real bip32Derivation (xfp + native-segwit path) on the PSBT the device receives', async () => {
    await parsedResult(dto.serializedTx, stub.transport);

    const input = stub.requestPsbt().data.inputs[0];
    const derivation = input.bip32Derivation?.[0] as
      | Bip32Derivation
      | undefined;
    expect(derivation).toBeDefined();
    expect(derivation!.masterFingerprint).toEqual(Buffer.from(XFP_HEX, 'hex'));
    expect(derivation!.pubkey.toString('hex')).toBe(dto.publicKeyHexes[0]);
    expect(derivation!.path).toBe("m/84'/0'/0'/0/0");
  });

  it('sends the default wallet policy key origin alongside the PSBT', async () => {
    await parsedResult(dto.serializedTx, stub.transport);

    expect(stub.policyProps()).toEqual(
      expect.objectContaining({
        masterFingerprint: XFP_HEX,
        accountPath: "m/84'/0'/0'",
        extendedPublicKey: 'xpub-native',
      }),
    );
  });

  it('finalizes and extracts a real signed transaction hex', async () => {
    const parsed = await parsedResult(dto.serializedTx, stub.transport);

    expect(parsed.network).toBe('mainnet');
    expect(parsed.hex.length).toBeGreaterThan(0);
    const tx = bitcoin.Transaction.fromHex(parsed.hex);
    expect(tx.ins).toHaveLength(1);
    expect(tx.ins[0].witness.length).toBeGreaterThan(0);
  });

  it('rejects a corrupted device signature instead of finalizing it', async () => {
    const corruptingTransport: LedgerBitcoinTransport = {
      ...stub.transport,
      signPsbt: async (descriptor, props) => {
        const signatures = await stub.transport.signPsbt(descriptor, props);
        return signatures.map(entry => {
          const signature = Buffer.from(entry.signature);
          signature[signature.length - 2] ^= 0x01;
          return { ...entry, signature };
        });
      },
    };

    await expect(
      parsedResult(dto.serializedTx, corruptingTransport),
    ).rejects.toThrow('Ledger returned an invalid signature for the PSBT');
  });

  it('signs a 2-input PSBT with cryptographically valid signatures paired to their own inputs', async () => {
    const multiDto = buildUnsignedTxDto(2);
    const multiStub = makeSigningTransport(multiDto.keyPairs);

    const parsed = await parsedResult(
      multiDto.serializedTx,
      multiStub.transport,
    );

    const tx = bitcoin.Transaction.fromHex(parsed.hex);
    expect(tx.ins).toHaveLength(2);
    tx.ins.forEach((txIn, index) => {
      expect(txIn.witness[1].toString('hex')).toBe(
        multiDto.publicKeyHexes[index],
      );
    });

    const rePsbt = bitcoin.Psbt.fromHex(multiDto.unsignedPsbtHex);
    tx.ins.forEach((txIn, index) => {
      rePsbt.updateInput(index, {
        partialSig: [{ pubkey: txIn.witness[1], signature: txIn.witness[0] }],
      });
    });
    expect(
      rePsbt.validateSignaturesOfAllInputs((pubkey, messageHash, signature) =>
        ecc.verify(messageHash, pubkey, signature),
      ),
    ).toBe(true);
  });
});
