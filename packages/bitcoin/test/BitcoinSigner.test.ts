/* eslint-disable unicorn/no-useless-undefined, no-magic-numbers, no-loop-func, @typescript-eslint/no-non-null-assertion, unicorn/consistent-function-scoping, @typescript-eslint/no-explicit-any, @typescript-eslint/no-var-requires, camelcase */
import { BitcoinSigner, signTx } from '../src/wallet/lib/wallet/BitcoinSigner';
import { AddressType, ChainType, KeyPair, Network, UnsignedTransaction } from '../src/wallet/lib/common';
import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from '@bitcoinerlab/secp256k1';
import * as ECPairFactory from 'ecpair';

const ECPair = ECPairFactory.ECPairFactory(ecc);
bitcoin.initEccLib(ecc);

describe('BitcoinSigner', () => {
  let keyPair: KeyPair;
  let publicKey: Uint8Array;
  let privateKey: Uint8Array;

  beforeEach(() => {
    const ecPair = ECPair.makeRandom();
    publicKey = ecPair.publicKey!;
    privateKey = ecPair.privateKey!;
    keyPair = { publicKey: Buffer.from(publicKey), privateKey: Buffer.from(privateKey) };
  });

  it('initializes with a valid keyPair', () => {
    const signer = new BitcoinSigner(keyPair);
    expect(signer.getPublicKey()).toEqual(Buffer.from(publicKey));
  });

  it('throws if private key is missing', () => {
    expect(() => new BitcoinSigner({ publicKey: Buffer.from(publicKey) } as KeyPair)).toThrow(
      'Private key is required to sign transactions.'
    );
  });

  it('throws if hash is not 32 bytes', () => {
    const signer = new BitcoinSigner(keyPair);
    const badHash = Buffer.alloc(31);
    expect(() => signer.sign(badHash)).toThrow('Hash must be 32 bytes.');
  });

  it('signs a 32-byte hash and produces a valid signature', () => {
    const signer = new BitcoinSigner(keyPair);
    const hash = Buffer.alloc(32, 0x01);
    const signature = signer.sign(hash);

    const isValid = ecc.verify(new Uint8Array(hash), new Uint8Array(publicKey), new Uint8Array(signature));

    expect(signature).toBeInstanceOf(Buffer);
    expect(signature.length).toBeGreaterThan(0);
    expect(isValid).toBe(true);
  });

  it('clears secrets from memory', () => {
    const pair = { ...keyPair, privateKey: Buffer.from(privateKey) };
    const signer = new BitcoinSigner(pair);
    signer.clearSecrets();
    expect(pair.privateKey.every((b) => b === 0)).toBe(true);
  });
});

describe('signTx', () => {
  it('signs and finalizes a PSBT, returning valid hex and signature', () => {
    const ecPair = ECPair.makeRandom();
    const publicKey = Buffer.from(ecPair.publicKey!);
    const privateKey = Buffer.from(ecPair.privateKey!);
    const keyPair = { publicKey, privateKey };

    const network = bitcoin.networks.testnet;
    const p2wpkh = bitcoin.payments.p2wpkh({ pubkey: publicKey, network });

    const psbt = new bitcoin.Psbt({ network });

    psbt.addInput({
      hash: 'f'.repeat(64),
      index: 0,
      witnessUtxo: {
        script: p2wpkh.output!,
        value: 10_000
      }
    });

    psbt.addOutput({
      address: p2wpkh.address!,
      value: 9000
    });

    const unsignedTx: UnsignedTransaction = {
      context: psbt,
      toAddress: p2wpkh.address!,
      amount: BigInt(9000),
      fee: BigInt(1000),
      vBytes: 111,
      signers: [
        {
          address: p2wpkh.address!,
          publicKeyHex: publicKey.toString('hex'),
          account: 0,
          chain: ChainType.External,
          index: 0,
          addressType: AddressType.Legacy,
          network: Network.Testnet
        }
      ]
    };

    const signer = new BitcoinSigner(keyPair);

    const signedTx = signTx(unsignedTx, [signer]);

    expect(signedTx.hex.length).toBeGreaterThan(0);
    expect(signedTx.context).toBeInstanceOf(bitcoin.Psbt);

    const rePsbt = new bitcoin.Psbt({ network });
    rePsbt.addInput({
      hash: 'f'.repeat(64),
      index: 0,
      witnessUtxo: {
        script: p2wpkh.output!,
        value: 10_000
      }
    });
    rePsbt.addOutput({
      address: p2wpkh.address!,
      value: 9000
    });

    rePsbt.signInput(0, signer);

    const isValid = rePsbt.validateSignaturesOfInput(0, (pubkey, msgHash, sig) => ecc.verify(msgHash, pubkey, sig));
    expect(isValid).toBe(true);
  });
});
