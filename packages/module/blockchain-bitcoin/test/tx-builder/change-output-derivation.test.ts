import { BitcoinNetwork } from '@lace-contract/bitcoin-context';
import { describe, expect, it } from 'vitest';

import { AddressType, ChainType } from '../../src/common';
import { TransactionBuilder } from '../../src/tx-builder';

import type { DerivedAddress } from '../../src/common';
import type { BitcoinUTxO } from '@lace-contract/bitcoin-context';

const CHANGE_ADDRESS = 'tb1qwj666s6uktl2q5am0uej008usfsg93fgrwjuuf';
const CHANGE_PUBKEY_HEX =
  '03797dd653040d344fd048c1ad05d4cbcb2178b30c6a0c4276994795f3e833da41';
const RECIPIENT_ADDRESS = 'tb1qujrdfmuk7xe7rmx8zzk5n6gyxhz8p84ynwv9l2';
const XFP_HEX = 'deadbeef';

const changeDerivation: DerivedAddress = {
  address: CHANGE_ADDRESS,
  addressType: AddressType.NativeSegWit,
  network: BitcoinNetwork.Testnet,
  account: 0,
  chain: ChainType.External,
  index: 0,
  publicKeyHex: CHANGE_PUBKEY_HEX,
};

const knownAddress = {
  address: CHANGE_ADDRESS,
  publicKeyHex: CHANGE_PUBKEY_HEX,
} as unknown as DerivedAddress;

const utxo: BitcoinUTxO = {
  txId: '1d9245e858a53a79c1fed40deb9666f782f688113b9a5b2bdc01dc016953ed34',
  index: 0,
  satoshis: 10_000_000,
  address: CHANGE_ADDRESS,
  script: '',
  confirmations: 1,
  height: 0,
  runes: [],
  inscriptions: [],
};

const buildWith = (
  configure: (builder: TransactionBuilder) => void,
): ReturnType<TransactionBuilder['build']> => {
  const builder = new TransactionBuilder(BitcoinNetwork.Testnet, 0.001, [
    knownAddress,
  ]);
  builder.setUtxoSet([utxo]);
  configure(builder);
  return builder.build();
};

const changeOutputIndex = (
  result: ReturnType<TransactionBuilder['build']>,
): number =>
  result.context.txOutputs.findIndex(out => out.address === CHANGE_ADDRESS);

describe('TransactionBuilder change-output bip32Derivation', () => {
  it('stamps the change output with the device xfp, change pubkey, and path', () => {
    const result = buildWith(builder => {
      builder
        .setChange(changeDerivation, XFP_HEX)
        .addOutput(RECIPIENT_ADDRESS, 1000);
    });

    const index = changeOutputIndex(result);
    expect(index).toBeGreaterThanOrEqual(0);

    const derivation = result.context.data.outputs[index].bip32Derivation;
    expect(derivation).toHaveLength(1);
    expect(derivation![0].masterFingerprint).toEqual(
      Buffer.from(XFP_HEX, 'hex'),
    );
    expect(derivation![0].pubkey).toEqual(
      Buffer.from(CHANGE_PUBKEY_HEX, 'hex'),
    );
    expect(derivation![0].path).toBe("m/84'/1'/0'/0/0");
  });

  it('uses the internal-change path when the change derivation is internal', () => {
    const result = buildWith(builder => {
      builder
        .setChange({ ...changeDerivation, chain: ChainType.Internal }, XFP_HEX)
        .addOutput(RECIPIENT_ADDRESS, 1000);
    });

    const index = changeOutputIndex(result);
    expect(result.context.data.outputs[index].bip32Derivation![0].path).toBe(
      "m/84'/1'/0'/1/0",
    );
  });

  it('does not stamp any output when the master fingerprint is absent', () => {
    const result = buildWith(builder => {
      builder.setChange(changeDerivation).addOutput(RECIPIENT_ADDRESS, 1000);
    });

    for (const output of result.context.data.outputs) {
      expect(output.bip32Derivation).toBeUndefined();
    }
  });

  it('does not crash and stamps nothing when there is no change output', () => {
    const result = buildWith(builder => {
      builder
        .setChange(changeDerivation, XFP_HEX)
        .addOutput(RECIPIENT_ADDRESS, 9_989_000);
    });

    expect(changeOutputIndex(result)).toBe(-1);
    for (const output of result.context.data.outputs) {
      expect(output.bip32Derivation).toBeUndefined();
    }
  });

  it('stamps the change output (last), not the recipient, on a self-send to the change address', () => {
    const result = buildWith(builder => {
      builder
        .setChange(changeDerivation, XFP_HEX)
        .addOutput(CHANGE_ADDRESS, 1000);
    });

    const matchingIndexes = result.context.txOutputs
      .map((out, index) => (out.address === CHANGE_ADDRESS ? index : -1))
      .filter(index => index !== -1);
    expect(matchingIndexes.length).toBe(2);

    const recipientIndex = matchingIndexes[0];
    const changeIndex = matchingIndexes[matchingIndexes.length - 1];

    expect(
      result.context.data.outputs[recipientIndex].bip32Derivation,
    ).toBeUndefined();
    expect(
      result.context.data.outputs[changeIndex].bip32Derivation,
    ).toHaveLength(1);
    expect(
      result.context.data.outputs[changeIndex].bip32Derivation![0].path,
    ).toBe("m/84'/1'/0'/0/0");
  });
});
