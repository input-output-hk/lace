import { BitcoinNetwork } from '@lace-contract/bitcoin-context';
import { AccountId } from '@lace-contract/wallet-repo';
import { HexBytes, Ok, Err } from '@lace-lib/util';
import * as bitcoin from 'bitcoinjs-lib';
import { BehaviorSubject, firstValueFrom, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { makeSubmitTx } from '../../src/tx-executor-implementation/submit-tx';

import type { SignedBitcoinTransactionDto } from '../../src/common/transaction';
import type { BitcoinUTxO } from '@lace-contract/bitcoin-context';
import type { SideEffectDependencies } from '@lace-contract/module';

const testAccountId = AccountId('test-account');
const ownAddress = 'tb1qwj666s6uktl2q5am0uej008usfsg93fgrwjuuf';
const foreignAddress = 'tb1qujrdfmuk7xe7rmx8zzk5n6gyxhz8p84ynwv9l2';

const previousTxId =
  '39a7a284c2a0948189dc45dec670211cd4d72f7b66c5726c08d9b3df11e44d58';

const makeOwnUtxo = (): BitcoinUTxO => ({
  txId: previousTxId,
  index: 0,
  satoshis: 10_000_000,
  address: ownAddress,
  script: '',
  confirmations: 1,
  height: 0,
  runes: [],
  inscriptions: [],
});

const buildRawTxHex = (): { hex: string; txId: string } => {
  const tx = new bitcoin.Transaction();
  const previousHashLE = Buffer.from(previousTxId, 'hex').reverse();
  tx.addInput(previousHashLE, 0);
  tx.addOutput(
    bitcoin.address.toOutputScript(foreignAddress, bitcoin.networks.testnet),
    3_000_000,
  );
  tx.addOutput(
    bitcoin.address.toOutputScript(ownAddress, bitcoin.networks.testnet),
    6_800_000,
  );
  return { hex: tx.toHex(), txId: tx.getId() };
};

const buildSerializedPayload = (hex: string): string => {
  const dto: SignedBitcoinTransactionDto = {
    network: BitcoinNetwork.Testnet,
    hex,
  };
  return HexBytes.fromUTF8(JSON.stringify(dto));
};

const logger = {
  debug: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  trace: vi.fn(),
};

const makeWalletMock = ({
  utxos,
  submitTransaction,
}: {
  utxos: BitcoinUTxO[];
  submitTransaction: ReturnType<typeof vi.fn>;
}) => ({
  submitTransaction,
  utxos$: of(utxos),
  addresses$: of([{ address: ownAddress, network: BitcoinNetwork.Testnet }]),
});

const makeWalletsSubject = (wallet: ReturnType<typeof makeWalletMock>) =>
  new BehaviorSubject({
    [testAccountId]: wallet,
  } as unknown as SideEffectDependencies['bitcoinAccountWallets$']['value']);

describe('makeSubmitTx (bitcoin)', () => {
  it('returns an error result when the wallet rejects the tx', async () => {
    const { hex } = buildRawTxHex();
    const serializedTx = buildSerializedPayload(hex);

    const providerSubmitTransaction = vi.fn();

    const deps = {
      bitcoinProvider: {
        submitTransaction: providerSubmitTransaction,
      },
      bitcoinAccountWallets$: makeWalletsSubject(
        makeWalletMock({
          utxos: [makeOwnUtxo()],
          submitTransaction: vi.fn(() =>
            of(Err({ reason: 'invalid', name: 'ProviderError' })),
          ),
        }),
      ),
      logger,
    } as unknown as SideEffectDependencies;

    const submit = makeSubmitTx(deps);
    const result = await firstValueFrom(
      submit({
        accountId: testAccountId,
        blockchainName: 'Bitcoin',
        blockchainSpecificSendFlowData: {},
        serializedTx,
      }),
    );

    expect(result.success).toBe(false);
    expect(providerSubmitTransaction).not.toHaveBeenCalled();
  });

  it('returns an error result when the provider rejects the tx on the fallback path', async () => {
    const { hex } = buildRawTxHex();
    const serializedTx = buildSerializedPayload(hex);

    const deps = {
      bitcoinProvider: {
        submitTransaction: vi.fn(() =>
          of(Err({ reason: 'invalid', name: 'ProviderError' })),
        ),
      },
      bitcoinAccountWallets$: new BehaviorSubject(
        {} as unknown as SideEffectDependencies['bitcoinAccountWallets$']['value'],
      ),
      logger,
    } as unknown as SideEffectDependencies;

    const submit = makeSubmitTx(deps);
    const result = await firstValueFrom(
      submit({
        accountId: testAccountId,
        blockchainName: 'Bitcoin',
        blockchainSpecificSendFlowData: {},
        serializedTx,
      }),
    );

    expect(result.success).toBe(false);
  });

  it('broadcasts through the account wallet and returns txId plus Bitcoin in-flight metadata on success', async () => {
    const { hex, txId } = buildRawTxHex();
    const serializedTx = buildSerializedPayload(hex);

    const walletSubmitTransaction = vi.fn(() => of(Ok(txId)));
    const providerSubmitTransaction = vi.fn();

    const deps = {
      bitcoinProvider: {
        submitTransaction: providerSubmitTransaction,
      },
      bitcoinAccountWallets$: makeWalletsSubject(
        makeWalletMock({
          utxos: [makeOwnUtxo()],
          submitTransaction: walletSubmitTransaction,
        }),
      ),
      logger,
    } as unknown as SideEffectDependencies;

    const submit = makeSubmitTx(deps);
    const result = await firstValueFrom(
      submit({
        accountId: testAccountId,
        blockchainName: 'Bitcoin',
        blockchainSpecificSendFlowData: {},
        serializedTx,
      }),
    );

    expect(walletSubmitTransaction).toHaveBeenCalledTimes(1);
    expect(walletSubmitTransaction).toHaveBeenCalledWith(hex);
    expect(providerSubmitTransaction).not.toHaveBeenCalled();

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.txId).toBe(txId);
    expect(result.blockchainSpecificActivityMetadata).toEqual({
      Bitcoin: {
        consumedInputs: [{ txId: previousTxId, index: 0 }],
        producedOutputs: [
          expect.objectContaining({
            txId,
            index: 0,
            satoshis: 3_000_000,
            address: foreignAddress,
            confirmations: 0,
          }) as unknown as Partial<BitcoinUTxO>,
          expect.objectContaining({
            txId,
            index: 1,
            satoshis: 6_800_000,
            address: ownAddress,
            confirmations: 0,
          }) as unknown as Partial<BitcoinUTxO>,
        ],
      },
    });
  });

  it('falls back to the provider when the submitting account has no wallet registered', async () => {
    const { hex, txId } = buildRawTxHex();
    const serializedTx = buildSerializedPayload(hex);

    const providerSubmitTransaction = vi.fn(() => of(Ok(txId)));

    const deps = {
      bitcoinProvider: {
        submitTransaction: providerSubmitTransaction,
      },
      bitcoinAccountWallets$: new BehaviorSubject(
        {} as unknown as SideEffectDependencies['bitcoinAccountWallets$']['value'],
      ),
      logger,
    } as unknown as SideEffectDependencies;

    const submit = makeSubmitTx(deps);
    const result = await firstValueFrom(
      submit({
        accountId: testAccountId,
        blockchainName: 'Bitcoin',
        blockchainSpecificSendFlowData: {},
        serializedTx,
      }),
    );

    expect(providerSubmitTransaction).toHaveBeenCalledTimes(1);
    expect(providerSubmitTransaction).toHaveBeenCalledWith(
      { network: BitcoinNetwork.Testnet },
      hex,
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.txId).toBe(txId);
    expect(result.blockchainSpecificActivityMetadata).toBeUndefined();
  });

  it('returns success with undefined metadata when the tx does not involve the account', async () => {
    const tx = new bitcoin.Transaction();
    const previousHashLE = Buffer.from(previousTxId, 'hex').reverse();
    tx.addInput(previousHashLE, 0);
    tx.addOutput(
      bitcoin.address.toOutputScript(foreignAddress, bitcoin.networks.testnet),
      1_000,
    );
    const hex = tx.toHex();
    const txId = tx.getId();
    const serializedTx = buildSerializedPayload(hex);

    const deps = {
      bitcoinProvider: {
        submitTransaction: vi.fn(),
      },
      bitcoinAccountWallets$: new BehaviorSubject({
        [testAccountId]: {
          submitTransaction: vi.fn(() => of(Ok(txId))),
          utxos$: of([]),
          addresses$: of([]),
        },
      } as unknown as SideEffectDependencies['bitcoinAccountWallets$']['value']),
      logger,
    } as unknown as SideEffectDependencies;

    const submit = makeSubmitTx(deps);
    const result = await firstValueFrom(
      submit({
        accountId: testAccountId,
        blockchainName: 'Bitcoin',
        blockchainSpecificSendFlowData: {},
        serializedTx,
      }),
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.blockchainSpecificActivityMetadata).toBeUndefined();
  });
});
