import { BitcoinNetwork } from '@lace-contract/bitcoin-context';
import * as bitcoin from 'bitcoinjs-lib';
import { describe, expect, it } from 'vitest';

import { toTrezorSignTransactionParams } from '../../../src/bitcoin/signing/psbt-to-trezor';

import type { BitcoinUnsignedTxDto } from '@lace-contract/bitcoin-context';

const XFP = 'deadbeef';
const FOREIGN_XFP = '01020304';
const HARDENED = 0x80_00_00_00;

const PK_EXTERNAL = Buffer.from('02' + '11'.repeat(32), 'hex');
const PK_CHANGE = Buffer.from('02' + '22'.repeat(32), 'hex');
const PK_RECIPIENT = Buffer.from('03' + '33'.repeat(32), 'hex');

/** Internal-order outpoint hash whose display txid is 'bb' + 'aa' * 31. */
const OUTPOINT_HASH = Buffer.from('aa'.repeat(31) + 'bb', 'hex');
const OUTPOINT_TXID = 'bb' + 'aa'.repeat(31);

const p2wpkhScript = (
  pubkey: Buffer,
  network: bitcoin.Network = bitcoin.networks.bitcoin,
): Buffer => bitcoin.payments.p2wpkh({ pubkey, network }).output!;

const p2wpkhAddress = (
  pubkey: Buffer,
  network: bitcoin.Network = bitcoin.networks.bitcoin,
): string => bitcoin.payments.p2wpkh({ pubkey, network }).address!;

/** Real previous transaction paying the given outputs. */
const makePreviousTx = (
  outputs: { script: Buffer; value: number }[],
): bitcoin.Transaction => {
  const tx = new bitcoin.Transaction();
  tx.version = 2;
  tx.locktime = 0;
  tx.addInput(OUTPOINT_HASH, 1, 0xff_ff_ff_fd, Buffer.from('0014aa', 'hex'));
  for (const output of outputs) {
    tx.addOutput(output.script, output.value);
  }
  return tx;
};

/** Adds a fully populated hardware input (witnessUtxo + nonWitnessUtxo). */
const addHardwareInput = (
  psbt: bitcoin.Psbt,
  previousTx: bitcoin.Transaction,
  options: { vout?: number; sequence?: number } = {},
): void => {
  const vout = options.vout ?? 0;
  psbt.addInput({
    hash: previousTx.getHash(),
    index: vout,
    witnessUtxo: previousTx.outs[vout],
    nonWitnessUtxo: previousTx.toBuffer(),
    sequence: options.sequence,
  });
};

const signerEntry = (
  overrides: Partial<BitcoinUnsignedTxDto['signers'][number]> = {},
): BitcoinUnsignedTxDto['signers'][number] => ({
  publicKeyHex: PK_EXTERNAL.toString('hex'),
  addressType: 'NativeSegWit',
  account: 0,
  chain: 'external',
  index: 0,
  network: 'mainnet',
  ...overrides,
});

const dtoFor = (
  psbt: bitcoin.Psbt,
  signers: BitcoinUnsignedTxDto['signers'],
  network = 'mainnet',
): BitcoinUnsignedTxDto => ({ context: psbt.toHex(), network, signers });

const mainnetProps = {
  masterFingerprint: XFP,
  network: BitcoinNetwork.Mainnet,
};

/**
 * Two-input transaction paying a recipient, returning stamped change and
 * embedding an OP_RETURN, the shape the Lace builder produces for hardware
 * accounts. Locktime and input sequences differ from the firmware defaults
 * so the tests catch fields silently falling back to them.
 */
const buildMainFixture = () => {
  const previousTxA = makePreviousTx([
    { script: p2wpkhScript(PK_EXTERNAL), value: 100_000 },
    { script: p2wpkhScript(PK_RECIPIENT), value: 5000 },
  ]);
  const previousTxB = makePreviousTx([
    { script: p2wpkhScript(PK_CHANGE), value: 50_000 },
  ]);

  const psbt = new bitcoin.Psbt({ network: bitcoin.networks.bitcoin });
  psbt.setLocktime(650_000);
  addHardwareInput(psbt, previousTxA, { sequence: 0xff_ff_ff_fd });
  addHardwareInput(psbt, previousTxB, { sequence: 0xff_ff_ff_fe });

  psbt.addOutput({ address: p2wpkhAddress(PK_RECIPIENT), value: 60_000 });
  psbt.addOutput({ address: p2wpkhAddress(PK_CHANGE), value: 80_000 });
  psbt.addOutput({
    script: bitcoin.payments.embed({ data: [Buffer.from('lace', 'utf8')] })
      .output!,
    value: 0,
  });
  psbt.updateOutput(1, {
    bip32Derivation: [
      {
        masterFingerprint: Buffer.from(XFP, 'hex'),
        pubkey: PK_CHANGE,
        path: "m/84'/0'/0'/1/3",
      },
    ],
  });

  const dto = dtoFor(psbt, [
    signerEntry(),
    signerEntry({
      publicKeyHex: PK_CHANGE.toString('hex'),
      chain: 'internal',
      index: 5,
    }),
  ]);

  return { dto, previousTxA, previousTxB };
};

describe('toTrezorSignTransactionParams', () => {
  describe('inputs', () => {
    it('maps each input to its display-order outpoint, witnessUtxo amount and hardened path', () => {
      const { dto, previousTxA, previousTxB } = buildMainFixture();

      const { inputs } = toTrezorSignTransactionParams(dto, mainnetProps);

      expect(inputs).toEqual([
        {
          prev_hash: previousTxA.getId(),
          prev_index: 0,
          amount: '100000',
          address_n: [84 + HARDENED, HARDENED, HARDENED, 0, 0],
          script_type: 'SPENDWITNESS',
          sequence: 0xff_ff_ff_fd,
        },
        {
          prev_hash: previousTxB.getId(),
          prev_index: 0,
          amount: '50000',
          address_n: [84 + HARDENED, HARDENED, HARDENED, 1, 5],
          script_type: 'SPENDWITNESS',
          sequence: 0xff_ff_ff_fe,
        },
      ]);
    });

    it('uses the testnet coin type in input paths for testnet signers', () => {
      const previousTx = makePreviousTx([
        {
          script: p2wpkhScript(PK_EXTERNAL, bitcoin.networks.testnet),
          value: 100_000,
        },
      ]);
      const psbt = new bitcoin.Psbt({ network: bitcoin.networks.testnet });
      addHardwareInput(psbt, previousTx);
      psbt.addOutput({
        address: p2wpkhAddress(PK_RECIPIENT, bitcoin.networks.testnet),
        value: 90_000,
      });
      const dto = dtoFor(
        psbt,
        [signerEntry({ network: 'testnet4' })],
        'testnet4',
      );

      const { inputs } = toTrezorSignTransactionParams(dto, {
        masterFingerprint: XFP,
        network: BitcoinNetwork.Testnet,
      });

      expect(inputs[0].address_n).toEqual([
        84 + HARDENED,
        1 + HARDENED,
        HARDENED,
        0,
        0,
      ]);
    });

    it('throws when an input is missing its witnessUtxo', () => {
      const previousTx = makePreviousTx([
        { script: p2wpkhScript(PK_EXTERNAL), value: 100_000 },
      ]);
      const psbt = new bitcoin.Psbt();
      psbt.addInput({
        hash: previousTx.getHash(),
        index: 0,
        nonWitnessUtxo: previousTx.toBuffer(),
      });
      psbt.addOutput({ address: p2wpkhAddress(PK_RECIPIENT), value: 90_000 });

      expect(() =>
        toTrezorSignTransactionParams(
          dtoFor(psbt, [signerEntry()]),
          mainnetProps,
        ),
      ).toThrow('PSBT input 0 is missing its witnessUtxo');
    });

    it('throws when the signer entries do not match the input count', () => {
      const { dto } = buildMainFixture();

      expect(() =>
        toTrezorSignTransactionParams(
          { ...dto, signers: [signerEntry()] },
          mainnetProps,
        ),
      ).toThrow('has 2 inputs but 1 signer entries');
    });

    it('throws when a signer entry yields a malformed derivation path', () => {
      const previousTx = makePreviousTx([
        { script: p2wpkhScript(PK_EXTERNAL), value: 100_000 },
      ]);
      const psbt = new bitcoin.Psbt();
      addHardwareInput(psbt, previousTx);
      psbt.addOutput({ address: p2wpkhAddress(PK_RECIPIENT), value: 90_000 });
      const dto = dtoFor(psbt, [
        signerEntry({ account: 'xyz' as unknown as number }),
      ]);

      expect(() => toTrezorSignTransactionParams(dto, mainnetProps)).toThrow(
        "Malformed BIP-32 derivation path: m/84'/0'/xyz'/0/0",
      );
    });
  });

  describe('outputs', () => {
    it('maps recipient, stamped change and OP_RETURN outputs in PSBT order', () => {
      const { dto } = buildMainFixture();

      const { outputs } = toTrezorSignTransactionParams(dto, mainnetProps);

      expect(outputs).toEqual([
        {
          address: p2wpkhAddress(PK_RECIPIENT),
          amount: '60000',
          script_type: 'PAYTOADDRESS',
        },
        {
          address_n: [84 + HARDENED, HARDENED, HARDENED, 1, 3],
          amount: '80000',
          script_type: 'PAYTOWITNESS',
        },
        {
          op_return_data: Buffer.from('lace', 'utf8').toString('hex'),
          amount: '0',
          script_type: 'PAYTOOPRETURN',
        },
      ]);
    });

    it('detects the change output when our fingerprint is not the first derivation entry', () => {
      const previousTx = makePreviousTx([
        { script: p2wpkhScript(PK_EXTERNAL), value: 100_000 },
      ]);
      const psbt = new bitcoin.Psbt();
      addHardwareInput(psbt, previousTx);
      psbt.addOutput({ address: p2wpkhAddress(PK_CHANGE), value: 90_000 });
      psbt.updateOutput(0, {
        bip32Derivation: [
          {
            masterFingerprint: Buffer.from(FOREIGN_XFP, 'hex'),
            pubkey: PK_RECIPIENT,
            path: "m/84'/0'/0'/1/7",
          },
          {
            masterFingerprint: Buffer.from(XFP, 'hex'),
            pubkey: PK_CHANGE,
            path: "m/84'/0'/0'/1/3",
          },
        ],
      });

      const { outputs } = toTrezorSignTransactionParams(
        dtoFor(psbt, [signerEntry()]),
        mainnetProps,
      );

      expect(outputs).toEqual([
        {
          address_n: [84 + HARDENED, HARDENED, HARDENED, 1, 3],
          amount: '90000',
          script_type: 'PAYTOWITNESS',
        },
      ]);
    });

    it('does not treat an output stamped with a foreign fingerprint as change', () => {
      const previousTx = makePreviousTx([
        { script: p2wpkhScript(PK_EXTERNAL), value: 100_000 },
      ]);
      const psbt = new bitcoin.Psbt();
      addHardwareInput(psbt, previousTx);
      psbt.addOutput({ address: p2wpkhAddress(PK_RECIPIENT), value: 90_000 });
      psbt.updateOutput(0, {
        bip32Derivation: [
          {
            masterFingerprint: Buffer.from(FOREIGN_XFP, 'hex'),
            pubkey: PK_RECIPIENT,
            path: "m/84'/0'/0'/1/3",
          },
        ],
      });

      const { outputs } = toTrezorSignTransactionParams(
        dtoFor(psbt, [signerEntry()]),
        mainnetProps,
      );

      expect(outputs).toEqual([
        {
          address: p2wpkhAddress(PK_RECIPIENT),
          amount: '90000',
          script_type: 'PAYTOADDRESS',
        },
      ]);
    });

    it('maps every output by address when no change output is stamped', () => {
      const previousTx = makePreviousTx([
        { script: p2wpkhScript(PK_EXTERNAL), value: 100_000 },
      ]);
      const psbt = new bitcoin.Psbt();
      addHardwareInput(psbt, previousTx);
      psbt.addOutput({ address: p2wpkhAddress(PK_RECIPIENT), value: 40_000 });
      psbt.addOutput({ address: p2wpkhAddress(PK_CHANGE), value: 50_000 });

      const { outputs } = toTrezorSignTransactionParams(
        dtoFor(psbt, [signerEntry()]),
        mainnetProps,
      );

      expect(outputs.map(output => output.script_type)).toEqual([
        'PAYTOADDRESS',
        'PAYTOADDRESS',
      ]);
    });

    it('decodes spend addresses with the testnet prefix on testnet', () => {
      const previousTx = makePreviousTx([
        {
          script: p2wpkhScript(PK_EXTERNAL, bitcoin.networks.testnet),
          value: 100_000,
        },
      ]);
      const psbt = new bitcoin.Psbt({ network: bitcoin.networks.testnet });
      addHardwareInput(psbt, previousTx);
      psbt.addOutput({
        address: p2wpkhAddress(PK_RECIPIENT, bitcoin.networks.testnet),
        value: 90_000,
      });

      const { outputs } = toTrezorSignTransactionParams(
        dtoFor(psbt, [signerEntry({ network: 'testnet4' })], 'testnet4'),
        { masterFingerprint: XFP, network: BitcoinNetwork.Testnet },
      );

      expect(outputs[0]).toEqual({
        address: p2wpkhAddress(PK_RECIPIENT, bitcoin.networks.testnet),
        amount: '90000',
        script_type: 'PAYTOADDRESS',
      });
      expect(
        (outputs[0] as { address: string }).address.startsWith('tb1'),
      ).toBe(true);
    });
  });

  describe('refTxs', () => {
    it('builds one previous transaction per referenced txid from the embedded nonWitnessUtxo', () => {
      const { dto, previousTxA, previousTxB } = buildMainFixture();

      const { refTxs } = toTrezorSignTransactionParams(dto, mainnetProps);

      expect(refTxs).toEqual([
        {
          hash: previousTxA.getId(),
          version: 2,
          lock_time: 0,
          inputs: [
            {
              prev_hash: OUTPOINT_TXID,
              prev_index: 1,
              script_sig: '0014aa',
              sequence: 0xff_ff_ff_fd,
            },
          ],
          bin_outputs: [
            {
              amount: '100000',
              script_pubkey: p2wpkhScript(PK_EXTERNAL).toString('hex'),
            },
            {
              amount: '5000',
              script_pubkey: p2wpkhScript(PK_RECIPIENT).toString('hex'),
            },
          ],
        },
        {
          hash: previousTxB.getId(),
          version: 2,
          lock_time: 0,
          inputs: [
            {
              prev_hash: OUTPOINT_TXID,
              prev_index: 1,
              script_sig: '0014aa',
              sequence: 0xff_ff_ff_fd,
            },
          ],
          bin_outputs: [
            {
              amount: '50000',
              script_pubkey: p2wpkhScript(PK_CHANGE).toString('hex'),
            },
          ],
        },
      ]);
    });

    it('dedupes previous transactions when several inputs spend the same txid', () => {
      const previousTx = makePreviousTx([
        { script: p2wpkhScript(PK_EXTERNAL), value: 100_000 },
        { script: p2wpkhScript(PK_CHANGE), value: 50_000 },
      ]);
      const psbt = new bitcoin.Psbt();
      addHardwareInput(psbt, previousTx);
      addHardwareInput(psbt, previousTx, { vout: 1 });
      psbt.addOutput({ address: p2wpkhAddress(PK_RECIPIENT), value: 140_000 });

      const { refTxs } = toTrezorSignTransactionParams(
        dtoFor(psbt, [
          signerEntry(),
          signerEntry({
            publicKeyHex: PK_CHANGE.toString('hex'),
            chain: 'internal',
            index: 2,
          }),
        ]),
        mainnetProps,
      );

      expect(refTxs).toHaveLength(1);
      expect(refTxs[0].hash).toBe(previousTx.getId());
    });

    it('throws when an input is missing its nonWitnessUtxo', () => {
      const previousTx = makePreviousTx([
        { script: p2wpkhScript(PK_EXTERNAL), value: 100_000 },
      ]);
      const psbt = new bitcoin.Psbt();
      psbt.addInput({
        hash: previousTx.getHash(),
        index: 0,
        witnessUtxo: previousTx.outs[0],
      });
      psbt.addOutput({ address: p2wpkhAddress(PK_RECIPIENT), value: 90_000 });

      expect(() =>
        toTrezorSignTransactionParams(
          dtoFor(psbt, [signerEntry()]),
          mainnetProps,
        ),
      ).toThrow(
        'PSBT input 0 is missing its previous transaction (nonWitnessUtxo)',
      );
    });
  });

  describe('transaction fields', () => {
    it('carries the unsigned transaction version and locktime into the params', () => {
      const { dto } = buildMainFixture();

      const params = toTrezorSignTransactionParams(dto, mainnetProps);

      expect(params.version).toBe(2);
      expect(params.locktime).toBe(650_000);
    });
  });

  describe('coin', () => {
    it("selects the 'btc' firmware coin for mainnet", () => {
      const { dto } = buildMainFixture();

      expect(toTrezorSignTransactionParams(dto, mainnetProps).coin).toBe('btc');
    });

    it("selects the 'test' firmware coin for testnet", () => {
      const previousTx = makePreviousTx([
        {
          script: p2wpkhScript(PK_EXTERNAL, bitcoin.networks.testnet),
          value: 100_000,
        },
      ]);
      const psbt = new bitcoin.Psbt({ network: bitcoin.networks.testnet });
      addHardwareInput(psbt, previousTx);
      psbt.addOutput({
        address: p2wpkhAddress(PK_RECIPIENT, bitcoin.networks.testnet),
        value: 90_000,
      });

      const { coin } = toTrezorSignTransactionParams(
        dtoFor(psbt, [signerEntry({ network: 'testnet4' })], 'testnet4'),
        { masterFingerprint: XFP, network: BitcoinNetwork.Testnet },
      );

      expect(coin).toBe('test');
    });
  });
});
