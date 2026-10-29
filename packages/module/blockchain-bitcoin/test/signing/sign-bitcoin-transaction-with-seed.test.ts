import { BitcoinNetwork } from '@lace-contract/bitcoin-context';
import { SecretBox } from '@lace-lib/core';
import { HexBytes } from '@lace-lib/util';
import * as bitcoin from 'bitcoinjs-lib';
import { firstValueFrom, of } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  AddressType,
  ChainType,
  deriveAccountRootKeyPair,
  deriveAddressByType,
  deriveBip39Seed,
  deriveChildKeyPair,
  encodeUnsignedTxToString,
} from '../../src/common';
import { BitcoinInMemoryTransactionSigner } from '../../src/signing/bitcoin-in-memory-transaction-signer';
import { signBitcoinTransactionWithSeed } from '../../src/signing/sign-bitcoin-transaction-with-seed';
import { TransactionBuilder } from '../../src/tx-builder';
import { BitcoinSigner } from '../../src/wallet';

import type { DerivedAddress } from '../../src/common';
import type { BitcoinUTxO } from '@lace-contract/bitcoin-context';
import type { SignerAuth } from '@lace-contract/signer';

const MNEMONIC =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const PASSWORD = new Uint8Array([1, 2, 3, 4]);
/**
 * Signed hex produced by the in-memory signer before seed signing was
 * extracted, pinned so the extraction keeps the output byte-identical.
 */
const NATIVE_SEGWIT_SIGNED_HEX =
  '0200000000010134ed536901dc01dc2b5b9a3b1188f682f76696eb0dd4fec1793aa558e845921d0000000000ffffffff02e8030000000000001600146fa016500a3c6a737ebb260e2ddca78ba92345580468980000000000160014d0c4a3ef09e997b6e99e397e518fe3e41a118ca102483045022100cdca89c3b71b52740bb2a3edc4b35688a8e5f1d0b43d4a21dec5c0895bb9c94702203620c74573576c51f8523b73f016ef1cf879cbda6bc5b152bab07ef456be32d5012102e7ab2537b5d49e970309aae06e9e49f36ce1c9febbd44ec8e0d1cca0b4f9c31900000000';
/**
 * Signed hex produced by the in-memory signer for a Taproot input before seed
 * signing was extracted. It pins existing behaviour and is not asserted to be
 * a valid Taproot spend.
 */
const TAPROOT_SIGNED_HEX =
  '0200000000010134ed536901dc01dc2b5b9a3b1188f682f76696eb0dd4fec1793aa558e845921d0000000000ffffffff02e8030000000000001600146fa016500a3c6a737ebb260e2ddca78ba923455804689800000000002251203b82b2b2a9185315da6f80da5f06d0440d8a5e1457fa93387c2d919c86ec87860247304402207ae7e93f4c7639515f83f2a84f550cc7479a2c0cad84e9c08eb0d5ce41059502022011753a0d2299ad7fb6ccc76c902c8033b2988d193ef4f95800783e34a7715b7801210255355ca83c973f1d97ce0e3843c85d78905af16b4dc531bc488e57212d23011600000000';

const deriveAddress = (
  seed: Buffer,
  addressType: AddressType,
  index: number,
): DerivedAddress => {
  const root = deriveAccountRootKeyPair({
    seed,
    addressType,
    network: BitcoinNetwork.Testnet,
    account: 0,
  });
  const child = deriveChildKeyPair(
    root.pair.privateKey,
    ChainType.External,
    index,
  );
  return {
    address: deriveAddressByType(
      Buffer.from(child.pair.publicKey, 'hex'),
      addressType,
      bitcoin.networks.testnet,
    ),
    addressType,
    network: BitcoinNetwork.Testnet,
    account: 0,
    chain: ChainType.External,
    index,
    publicKeyHex: child.pair.publicKey,
  };
};

const buildUnsignedTx = (seed: Buffer, addressType: AddressType): HexBytes => {
  const owned = deriveAddress(seed, addressType, 0);
  const recipient = deriveAddress(seed, AddressType.NativeSegWit, 1);
  const utxo: BitcoinUTxO = {
    txId: '1d9245e858a53a79c1fed40deb9666f782f688113b9a5b2bdc01dc016953ed34',
    index: 0,
    satoshis: 10_000_000,
    address: owned.address,
    script: '',
    confirmations: 1,
    height: 0,
    runes: [],
    inscriptions: [],
  };
  const tx = new TransactionBuilder(BitcoinNetwork.Testnet, 0.001, [owned])
    .setUtxoSet([utxo])
    .setChangeAddress(owned.address)
    .addOutput(recipient.address, 1000)
    .build();
  return encodeUnsignedTxToString(tx);
};

const createAuth = (): SignerAuth => ({
  authenticate: vi.fn().mockReturnValue(of(true)),
  accessAuthSecret: vi
    .fn()
    .mockImplementation(
      <T>(callback: (secret: Uint8Array) => T): T =>
        callback(Uint8Array.from(PASSWORD)),
    ),
});

const signInMemory = async (seed: Buffer, serializedTx: HexBytes) => {
  const encrypted = await SecretBox.seal(seed, PASSWORD);
  const signer = new BitcoinInMemoryTransactionSigner({
    encryptedRootPrivateKey: HexBytes(Buffer.from(encrypted).toString('hex')),
    auth: createAuth(),
  });
  return firstValueFrom(signer.sign({ serializedTx }));
};

const signedHex = (serializedTx: HexBytes): string =>
  (JSON.parse(HexBytes.toUTF8(serializedTx)) as { hex: string }).hex;

describe('signBitcoinTransactionWithSeed', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    [AddressType.NativeSegWit, NATIVE_SEGWIT_SIGNED_HEX],
    [AddressType.Taproot, TAPROOT_SIGNED_HEX],
  ])(
    'signs a %s input with the pinned output, matching the in-memory signer',
    async (addressType, expectedHex) => {
      const seed = deriveBip39Seed(MNEMONIC);
      const serializedTx = buildUnsignedTx(seed, addressType);

      const fromSeed = signBitcoinTransactionWithSeed(serializedTx, seed);
      const inMemory = await signInMemory(seed, serializedTx);

      expect(fromSeed.serializedTx).toBe(inMemory.serializedTx);
      expect(signedHex(fromSeed.serializedTx)).toBe(expectedHex);
    },
  );

  it('does not mutate the caller-owned seed', () => {
    const seed = deriveBip39Seed(MNEMONIC);
    const original = Buffer.from(seed);
    const serializedTx = buildUnsignedTx(seed, AddressType.Taproot);

    signBitcoinTransactionWithSeed(serializedTx, seed);

    expect(seed.equals(original)).toBe(true);
  });

  it('wipes every derived private key after signing', () => {
    const clearSecrets = vi.spyOn(BitcoinSigner.prototype, 'clearSecrets');
    const seed = deriveBip39Seed(MNEMONIC);
    const serializedTx = buildUnsignedTx(seed, AddressType.NativeSegWit);

    signBitcoinTransactionWithSeed(serializedTx, seed);

    expect(clearSecrets).toHaveBeenCalledTimes(1);
  });

  it('wipes derived private keys when signing fails', () => {
    const clearSecrets = vi.spyOn(BitcoinSigner.prototype, 'clearSecrets');
    const seed = deriveBip39Seed(MNEMONIC);
    const original = Buffer.from(seed);
    const serializedTx = buildUnsignedTx(
      deriveBip39Seed(`${MNEMONIC} extra`),
      AddressType.NativeSegWit,
    );

    expect(() => signBitcoinTransactionWithSeed(serializedTx, seed)).toThrow();
    expect(clearSecrets).toHaveBeenCalledTimes(1);
    expect(seed.equals(original)).toBe(true);
  });

  it('throws on a malformed transaction without deriving keys', () => {
    const clearSecrets = vi.spyOn(BitcoinSigner.prototype, 'clearSecrets');
    const seed = deriveBip39Seed(MNEMONIC);
    const original = Buffer.from(seed);

    expect(() =>
      signBitcoinTransactionWithSeed(HexBytes.fromUTF8('not a tx'), seed),
    ).toThrow();
    expect(clearSecrets).not.toHaveBeenCalled();
    expect(seed.equals(original)).toBe(true);
  });
});
