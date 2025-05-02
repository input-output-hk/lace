/* eslint-disable no-magic-numbers, @typescript-eslint/no-non-null-assertion */
import { TransactionBuilder, Network, DerivedAddress } from '../src/wallet/lib';

describe('TransactionBuilder', () => {
  const knownAddress = {
    address: 'tb1qwj666s6uktl2q5am0uej008usfsg93fgrwjuuf',
    publicKeyHex: '03797dd653040d344fd048c1ad05d4cbcb2178b30c6a0c4276994795f3e833da41'
  } as unknown as DerivedAddress;

  const utxo = {
    txId: '1d9245e858a53a79c1fed40deb9666f782f688113b9a5b2bdc01dc016953ed34',
    index: 0,
    satoshis: BigInt(10_000_000),
    address: 'tb1qwj666s6uktl2q5am0uej008usfsg93fgrwjuuf'
  };

  it('throws if no UTXOs are set', () => {
    const builder = new TransactionBuilder(Network.Testnet, 0.001, [knownAddress]);
    builder.setChangeAddress('tb1qwj666s6uktl2q5am0uej008usfsg93fgrwjuuf');
    builder.addOutput('tb1qujrdfmuk7xe7rmx8zzk5n6gyxhz8p84ynwv9l2', BigInt(1000));

    expect(() => builder.build()).toThrow('No UTXOs available to fund the transaction.');
  });

  it('throws if no change address is set', () => {
    const builder = new TransactionBuilder(Network.Testnet, 0.001, [knownAddress]);
    builder.setUtxoSet([utxo]);
    builder.addOutput('tb1qujrdfmuk7xe7rmx8zzk5n6gyxhz8p84ynwv9l2', BigInt(1000));

    expect(() => builder.build()).toThrow('Change address not set.');
  });

  it('throws if no outputs are added', () => {
    const builder = new TransactionBuilder(Network.Testnet, 0.001, [knownAddress]);
    builder.setUtxoSet([utxo]);
    builder.setChangeAddress('tb1qwj666s6uktl2q5am0uej008usfsg93fgrwjuuf');

    expect(() => builder.build()).toThrow('No outputs have been added.');
  });

  it('builds a balanced transaction successfully', () => {
    const builder = new TransactionBuilder(Network.Testnet, 0.001, [knownAddress]);
    const changeAddress = 'tb1qwj666s6uktl2q5am0uej008usfsg93fgrwjuuf';
    const recipientAddress = 'tb1qujrdfmuk7xe7rmx8zzk5n6gyxhz8p84ynwv9l2';

    builder.setUtxoSet([utxo]).setChangeAddress(changeAddress).addOutput(recipientAddress, BigInt(1000));

    const result = builder.build();

    expect(result).toHaveProperty('context');
    expect(result).toHaveProperty('fee');
    expect(result).toHaveProperty('amount', BigInt(1000));
    expect(result).toHaveProperty('toAddress', recipientAddress);
    expect(result.vBytes).toBeGreaterThan(0);

    // Signer must be the known address from UTXO
    expect(result.signers.length).toBe(1);
    expect(result.signers[0].address).toBe(utxo.address);

    // Check transaction is balanced: inputs = outputs + fee
    const totalInput = utxo.satoshis;
    const totalOutput = result.context.txOutputs.reduce((acc, out) => acc + BigInt(out.value), BigInt(0));
    const fee = result.fee;

    expect(totalInput).toBe(totalOutput + fee);

    const changeOutput = result.context.txOutputs.find((out) => out.address === changeAddress);
    expect(changeOutput).toBeDefined();
    expect(changeOutput?.value).toEqual(Number(totalInput - BigInt(1000) - fee));
  });

  it('throws if UTXO address is unknown', () => {
    const builder = new TransactionBuilder(Network.Testnet, 0.001, []);
    builder.setUtxoSet([utxo]);
    builder.setChangeAddress('tb1qwj666s6uktl2q5am0uej008usfsg93fgrwjuuf');
    builder.addOutput('tb1qujrdfmuk7xe7rmx8zzk5n6gyxhz8p84ynwv9l2', BigInt(1000));

    expect(() => builder.build()).toThrow('Unknown address in UTXO set.');
  });
});
