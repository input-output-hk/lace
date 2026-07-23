import * as ecc from '@bitcoinerlab/secp256k1';
import { BitcoinNetwork } from '@lace-contract/bitcoin-context';
import * as bitcoin from 'bitcoinjs-lib';
import { ECPairFactory } from 'ecpair';
import { describe, expect, it } from 'vitest';

import { AddressType, ChainType } from '../../src/common';
import { TransactionBuilder } from '../../src/tx-builder';
import { BitcoinSigner, signTx } from '../../src/wallet';

import type { DerivedAddress } from '../../src/common';
import type { BitcoinUTxO } from '@lace-contract/bitcoin-context';

bitcoin.initEccLib(ecc);
const ECPair = ECPairFactory(ecc);
const NETWORK = bitcoin.networks.testnet;

const XFP_HEX = 'deadbeef';

/**
 * Builds a real funded P2WPKH testnet wallet address from a fresh key so the
 * input the builder selects can be signed with the matching private key.
 */
const buildOwnedAddress = (): {
  derivation: DerivedAddress;
  keyPair: ReturnType<typeof ECPair.makeRandom>;
} => {
  const keyPair = ECPair.makeRandom();
  const pubkey = Buffer.from(keyPair.publicKey);
  const address = bitcoin.payments.p2wpkh({ pubkey, network: NETWORK })
    .address!;
  return {
    derivation: {
      address,
      addressType: AddressType.NativeSegWit,
      network: BitcoinNetwork.Testnet,
      account: 0,
      chain: ChainType.External,
      index: 0,
      publicKeyHex: pubkey.toString('hex'),
    },
    keyPair,
  };
};

describe('in-memory signing with a change-output bip32Derivation present', () => {
  it('still finalizes and extracts a tx that has stamped change', () => {
    const { derivation, keyPair } = buildOwnedAddress();
    const recipient = bitcoin.payments.p2wpkh({
      pubkey: Buffer.from(ECPair.makeRandom().publicKey),
      network: NETWORK,
    }).address!;

    const utxo: BitcoinUTxO = {
      txId: '1d9245e858a53a79c1fed40deb9666f782f688113b9a5b2bdc01dc016953ed34',
      index: 0,
      satoshis: 10_000_000,
      address: derivation.address,
      script: '',
      confirmations: 1,
      height: 0,
      runes: [],
      inscriptions: [],
    };

    const tx = new TransactionBuilder(BitcoinNetwork.Testnet, 0.001, [
      derivation,
    ])
      .setUtxoSet([utxo])
      .setChange(derivation, XFP_HEX)
      .addOutput(recipient, 1000)
      .build();

    const changeIndex = tx.context.txOutputs.findIndex(
      out => out.address === derivation.address,
    );
    expect(changeIndex).toBeGreaterThanOrEqual(0);
    expect(tx.context.data.outputs[changeIndex].bip32Derivation).toHaveLength(
      1,
    );

    const signed = signTx(tx, [
      new BitcoinSigner({
        publicKey: Buffer.from(keyPair.publicKey),
        privateKey: Buffer.from(keyPair.privateKey!),
      }),
    ]);

    const extracted = bitcoin.Transaction.fromHex(signed.hex);
    expect(extracted.ins).toHaveLength(1);
    expect(extracted.ins[0].witness.length).toBeGreaterThan(0);
    expect(extracted.outs.length).toBeGreaterThanOrEqual(2);
  });
});
