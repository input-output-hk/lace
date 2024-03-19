/* eslint-disable no-magic-numbers */
import { Cardano } from '@cardano-sdk/core';
import { BaseWallet } from '@cardano-sdk/wallet';
import { InitializeTxProps } from '@cardano-sdk/tx-construction';
import * as mocks from '../../test/mocks';
import { buildTransaction } from '../build-transaction';

const sendToAddress = Cardano.PaymentAddress(
  'addr_test1qplfzem2xsc29wxysf8wkdqrm4s4mmncd40qnjq9sk84l3tuzcjqw982pcftgx53fu5527z2cj2tkx2h8ux2vxsg475q52ukj5'
);

// FIXME: wallet not settling error LW-6126
describe.skip('Testing build-transaction', () => {
  let wallet: BaseWallet;

  beforeEach(async () => {
    ({ wallet } = await mocks.mockWallet());
  });
  afterEach(() => wallet.shutdown());

  test('should validate and build a transaction successfully with enough coins', async () => {
    const output = { address: sendToAddress, value: { coins: BigInt(5_000_000) } };
    const txProps: InitializeTxProps = {
      outputs: new Set<Cardano.TxOut>([output])
    };
    const { transaction, minimumCoinQuantities } = await buildTransaction(txProps, wallet);

    expect(transaction).toBeDefined();
    expect(minimumCoinQuantities).toBeDefined();
    expect(minimumCoinQuantities.get(output).coinMissing).toBe(BigInt(0));
  });

  test('should validate and build a transaction successfully with coins missing', async () => {
    const output = { address: sendToAddress, value: { coins: BigInt(1000) } };
    const txProps: InitializeTxProps = {
      outputs: new Set([output])
    };
    const { transaction, minimumCoinQuantities } = await buildTransaction(txProps, wallet);

    expect(transaction).toBeDefined();
    expect(minimumCoinQuantities).toBeDefined();
    expect(minimumCoinQuantities.get(output).coinMissing).toBeGreaterThan(BigInt(0));
  });

  test('should throw an error if tx initialization fails', async () => {
    const output = { address: sendToAddress, value: { coins: BigInt(5_000_000_000) } };
    const txProps: InitializeTxProps = {
      outputs: new Set([output])
    };
    await expect(buildTransaction(txProps, wallet)).rejects.toThrow();
  });
});
