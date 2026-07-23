import { BitcoinNetwork } from '@lace-contract/bitcoin-context';
import { HexBytes } from '@lace-lib/util';
import * as bitcoin from 'bitcoinjs-lib';
import { firstValueFrom } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BitcoinTrezorTransactionSigner } from '../../../src/bitcoin/signing/bitcoin-trezor-transaction-signer';

import type { TrezorBitcoinConnect } from '../../../src/trezor-bitcoin-connect';
import type { BitcoinSignRequest } from '@lace-contract/bitcoin-context';

const XFP = 'deadbeef';
const SIGNED_TX_HEX = '02000000000101signed';
const HARDENED = 0x80_00_00_00;

const PK_EXTERNAL = Buffer.from('02' + '11'.repeat(32), 'hex');
const PK_RECIPIENT = Buffer.from('03' + '33'.repeat(32), 'hex');

const networkFor = (network: BitcoinNetwork): bitcoin.Network =>
  network === BitcoinNetwork.Mainnet
    ? bitcoin.networks.bitcoin
    : bitcoin.networks.testnet;

/**
 * Real single-input P2WPKH PSBT (witnessUtxo + nonWitnessUtxo) plus the
 * matching unsigned-tx DTO the signer consumes.
 */
const buildRequest = (
  network = BitcoinNetwork.Mainnet,
  dtoNetwork = 'mainnet',
): { request: BitcoinSignRequest; previousTx: bitcoin.Transaction } => {
  const net = networkFor(network);
  const previousTx = new bitcoin.Transaction();
  previousTx.version = 2;
  previousTx.addInput(Buffer.alloc(32, 7), 0);
  previousTx.addOutput(
    bitcoin.payments.p2wpkh({ pubkey: PK_EXTERNAL, network: net }).output!,
    100_000,
  );

  const psbt = new bitcoin.Psbt({ network: net });
  psbt.addInput({
    hash: previousTx.getHash(),
    index: 0,
    witnessUtxo: previousTx.outs[0],
    nonWitnessUtxo: previousTx.toBuffer(),
  });
  psbt.addOutput({
    address: bitcoin.payments.p2wpkh({ pubkey: PK_RECIPIENT, network: net })
      .address!,
    value: 90_000,
  });

  const dto = {
    context: psbt.toHex(),
    network: dtoNetwork,
    signers: [
      {
        publicKeyHex: PK_EXTERNAL.toString('hex'),
        addressType: 'NativeSegWit',
        account: 0,
        chain: 'external',
        index: 0,
        network: dtoNetwork,
      },
    ],
  };

  return {
    request: { serializedTx: HexBytes.fromUTF8(JSON.stringify(dto)) },
    previousTx: previousTx,
  };
};

const signTransaction = vi.fn();
const getConnect = vi.fn(
  async (): Promise<TrezorBitcoinConnect> =>
    ({ signTransaction } as unknown as TrezorBitcoinConnect),
);

const makeSigner = (network = BitcoinNetwork.Mainnet) =>
  new BitcoinTrezorTransactionSigner(
    { masterFingerprint: XFP, network },
    { getConnect },
  );

describe('BitcoinTrezorTransactionSigner', () => {
  beforeEach(() => {
    getConnect.mockClear();
    signTransaction.mockReset().mockResolvedValue({
      success: true,
      payload: { serializedTx: SIGNED_TX_HEX },
    });
  });

  it('sends the translated transaction to the device', async () => {
    const { request, previousTx } = buildRequest();

    await firstValueFrom(makeSigner().sign(request));

    expect(signTransaction).toHaveBeenCalledTimes(1);
    expect(signTransaction).toHaveBeenCalledWith({
      coin: 'btc',
      inputs: [
        {
          prev_hash: previousTx.getId(),
          prev_index: 0,
          amount: '100000',
          address_n: [84 + HARDENED, HARDENED, HARDENED, 0, 0],
          script_type: 'SPENDWITNESS',
          sequence: 0xff_ff_ff_ff,
        },
      ],
      outputs: [
        {
          address: bitcoin.payments.p2wpkh({
            pubkey: PK_RECIPIENT,
            network: bitcoin.networks.bitcoin,
          }).address,
          amount: '90000',
          script_type: 'PAYTOADDRESS',
        },
      ],
      refTxs: [expect.objectContaining({ hash: previousTx.getId() })],
      version: 2,
      locktime: 0,
    });
  });

  it("selects the 'test' firmware coin for a testnet account", async () => {
    const { request } = buildRequest(BitcoinNetwork.Testnet, 'testnet4');

    await firstValueFrom(makeSigner(BitcoinNetwork.Testnet).sign(request));

    expect(signTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ coin: 'test' }),
    );
  });

  it('returns the device-signed transaction as HexBytes JSON', async () => {
    const { request } = buildRequest();

    const result = await firstValueFrom(makeSigner().sign(request));

    expect(JSON.parse(HexBytes.toUTF8(result.serializedTx))).toEqual({
      network: 'mainnet',
      hex: SIGNED_TX_HEX,
    });
  });

  it('performs no connect I/O before subscription', () => {
    const { request } = buildRequest();

    makeSigner().sign(request);

    expect(getConnect).not.toHaveBeenCalled();
    expect(signTransaction).not.toHaveBeenCalled();
  });

  it('throws with the Trezor error when the device rejects the transaction', async () => {
    signTransaction.mockResolvedValue({
      success: false,
      payload: { error: 'Signing cancelled by user' },
    });
    const { request } = buildRequest();

    await expect(firstValueFrom(makeSigner().sign(request))).rejects.toThrow(
      'Trezor signTransaction failed: Signing cancelled by user',
    );
  });

  it('propagates a connect failure', async () => {
    getConnect.mockRejectedValueOnce(new Error('deep link round-trip failed'));
    const { request } = buildRequest();

    await expect(firstValueFrom(makeSigner().sign(request))).rejects.toThrow(
      'deep link round-trip failed',
    );
    expect(signTransaction).not.toHaveBeenCalled();
  });
});
