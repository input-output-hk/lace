import { ProviderError, ProviderFailure } from '@cardano-sdk/core';
import { ActivityType } from '@lace-contract/activities';
import {
  BITCOIN_TOKEN_ID,
  BitcoinNetwork,
} from '@lace-contract/bitcoin-context';
import { AccountId } from '@lace-contract/wallet-repo';
import { BigNumber, Err, HexBytes, Ok, Timestamp } from '@lace-lib/util';
import {
  address as bitcoinAddress,
  networks,
  Transaction,
} from 'bitcoinjs-lib';
import { firstValueFrom, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { decodeUnsignedTxFromString } from '../../src/common';
import {
  applyInFlightUtxoAdjustments,
  makeBuildTx,
} from '../../src/tx-executor-implementation/build-tx';

import type {
  Activity,
  PendingActivitiesByAccount,
} from '@lace-contract/activities';
import type {
  BitcoinInFlightUtxoActivityMetadata,
  BitcoinUTxO,
} from '@lace-contract/bitcoin-context';
import type { SideEffectDependencies } from '@lace-contract/module';
import type {
  TokenTransfer,
  TxExecutorImplementation,
} from '@lace-contract/tx-executor';

type BuildTxParamsShape = Parameters<TxExecutorImplementation['buildTx']>[0];

const testAccountId = AccountId('test-account');
const ownAddress = 'tb1qwj666s6uktl2q5am0uej008usfsg93fgrwjuuf';
const recipientAddress = 'tb1qujrdfmuk7xe7rmx8zzk5n6gyxhz8p84ynwv9l2';
const foreignAddress = 'tb1qpjg8qxhjxt4k0adjyskk0z6sd6x9wjh79pnd6p';

const previousTxIdA =
  '39a7a284c2a0948189dc45dec670211cd4d72f7b66c5726c08d9b3df11e44d58';
const previousTxIdB =
  '4c4e67bafa15e742c13c592b65c8f74c769cd7d9af04c848099672d1ba391b49';

const makeUtxo = ({
  txId,
  index,
  satoshis,
  address = ownAddress,
}: {
  txId: string;
  index: number;
  satoshis: number;
  address?: string;
}): BitcoinUTxO => ({
  txId,
  index,
  satoshis,
  address,
  script: '',
  confirmations: 1,
  height: 0,
  runes: [],
  inscriptions: [],
});

const inFlight = (
  metadata: BitcoinInFlightUtxoActivityMetadata,
  id = 'pending-activity-id',
): Activity => ({
  accountId: testAccountId,
  activityId: id,
  timestamp: Timestamp(0),
  tokenBalanceChanges: [],
  type: ActivityType.Pending,
  blockchainSpecific: { Bitcoin: metadata },
});

describe('applyInFlightUtxoAdjustments (bitcoin)', () => {
  it('returns a copy of the original list when there are no pending activities', () => {
    const utxos = [
      makeUtxo({ txId: previousTxIdA, index: 0, satoshis: 10_000_000 }),
    ];
    const result = applyInFlightUtxoAdjustments(
      utxos,
      new Set([ownAddress]),
      [],
    );
    expect(result).toEqual(utxos);
  });

  it('returns a copy of the original list when pending activities have no Bitcoin in-flight metadata', () => {
    const utxos = [
      makeUtxo({ txId: previousTxIdA, index: 0, satoshis: 10_000_000 }),
    ];
    const unrelated: Activity = {
      accountId: testAccountId,
      activityId: 'tx-x',
      timestamp: Timestamp(0),
      tokenBalanceChanges: [],
      type: ActivityType.Pending,
    };
    const result = applyInFlightUtxoAdjustments(utxos, new Set([ownAddress]), [
      unrelated,
    ]);
    expect(result).toEqual(utxos);
  });

  it('drops utxos consumed by a pending tx (input matches availableUtxo)', () => {
    const utxoA = makeUtxo({
      txId: previousTxIdA,
      index: 0,
      satoshis: 10_000_000,
    });
    const utxoB = makeUtxo({
      txId: previousTxIdA,
      index: 1,
      satoshis: 5_000_000,
    });

    const result = applyInFlightUtxoAdjustments(
      [utxoA, utxoB],
      new Set([ownAddress]),
      [
        inFlight({
          consumedInputs: [{ txId: previousTxIdA, index: 0 }],
          producedOutputs: [],
        }),
      ],
    );

    expect(result).toEqual([utxoB]);
  });

  it('does not drop utxos when a foreign input in consumedInputs is not in our available set', () => {
    const utxoA = makeUtxo({
      txId: previousTxIdA,
      index: 0,
      satoshis: 10_000_000,
    });

    const result = applyInFlightUtxoAdjustments(
      [utxoA],
      new Set([ownAddress]),
      [
        inFlight({
          consumedInputs: [{ txId: previousTxIdB, index: 99 }],
          producedOutputs: [],
        }),
      ],
    );

    expect(result).toEqual([utxoA]);
  });

  it('does not append produced outputs to the spendable set (unsafe on bitcoin due to RBF and mempool ancestor limits)', () => {
    const ownChange = makeUtxo({
      txId: previousTxIdB,
      index: 1,
      satoshis: 6_000_000,
    });
    const foreignOutput = makeUtxo({
      txId: previousTxIdB,
      index: 0,
      satoshis: 3_000_000,
      address: foreignAddress,
    });

    const result = applyInFlightUtxoAdjustments([], new Set([ownAddress]), [
      inFlight({
        consumedInputs: [],
        producedOutputs: [foreignOutput, ownChange],
      }),
    ]);

    expect(result).toEqual([]);
  });

  it('dropped input is not replaced by the pending tx own output', () => {
    const utxoA = makeUtxo({
      txId: previousTxIdA,
      index: 0,
      satoshis: 10_000_000,
    });
    const changeUtxo = makeUtxo({
      txId: previousTxIdB,
      index: 0,
      satoshis: 6_000_000,
    });

    const result = applyInFlightUtxoAdjustments(
      [utxoA],
      new Set([ownAddress]),
      [
        inFlight({
          consumedInputs: [{ txId: previousTxIdA, index: 0 }],
          producedOutputs: [changeUtxo],
        }),
      ],
    );

    expect(result).toEqual([]);
  });

  it('ignores activities that are not Pending', () => {
    const utxoA = makeUtxo({
      txId: previousTxIdA,
      index: 0,
      satoshis: 10_000_000,
    });
    const confirmed: Activity = {
      accountId: testAccountId,
      activityId: 'tx-confirmed',
      timestamp: Timestamp(0),
      tokenBalanceChanges: [],
      type: ActivityType.Send,
      blockchainSpecific: {
        Bitcoin: {
          consumedInputs: [{ txId: previousTxIdA, index: 0 }],
          producedOutputs: [],
        },
      },
    };
    const result = applyInFlightUtxoAdjustments(
      [utxoA],
      new Set([ownAddress]),
      [confirmed],
    );
    expect(result).toEqual([utxoA]);
  });

  it('merges consumed-input drops across multiple pending activities', () => {
    const utxoA = makeUtxo({
      txId: previousTxIdA,
      index: 0,
      satoshis: 10_000_000,
    });
    const utxoB = makeUtxo({
      txId: previousTxIdA,
      index: 1,
      satoshis: 5_000_000,
    });

    const result = applyInFlightUtxoAdjustments(
      [utxoA, utxoB],
      new Set([ownAddress]),
      [
        inFlight(
          {
            consumedInputs: [{ txId: previousTxIdA, index: 0 }],
            producedOutputs: [],
          },
          'tx1',
        ),
        inFlight(
          {
            consumedInputs: [{ txId: previousTxIdA, index: 1 }],
            producedOutputs: [],
          },
          'tx2',
        ),
      ],
    );

    expect(result).toEqual([]);
  });
});

const makeTokenTransfer = (normalizedAmount: bigint): TokenTransfer =>
  ({
    normalizedAmount: BigNumber(normalizedAmount),
    token: {
      accountId: testAccountId,
      blockchainName: 'Bitcoin',
      tokenId: BITCOIN_TOKEN_ID,
    },
  } as unknown as TokenTransfer);

const makeBuildParams = (normalizedAmount: bigint): BuildTxParamsShape =>
  ({
    accountId: testAccountId,
    blockchainName: 'Bitcoin',
    serializedTx: '',
    blockchainSpecificSendFlowData: {},
    txParams: [
      {
        address: recipientAddress,
        tokenTransfers: [makeTokenTransfer(normalizedAmount)],
        blockchainSpecific: {
          memo: '',
          feeRate: { feeOption: 'Low' as const },
        },
      },
    ],
  } as unknown as BuildTxParamsShape);

const logger = {
  debug: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  trace: vi.fn(),
};

const makeMockWallet = (
  utxos: BitcoinUTxO[],
  walletOverrides: Record<string, unknown> = {},
) => ({
  network: BitcoinNetwork.Testnet,
  utxos$: of(utxos),
  addresses$: of([
    {
      address: ownAddress,
      addressType: 'NativeSegWit',
      network: BitcoinNetwork.Testnet,
      account: 0,
      chain: 0,
      index: 0,
      publicKeyHex:
        '03797dd653040d344fd048c1ad05d4cbcb2178b30c6a0c4276994795f3e833da41',
    },
  ]),
  address: {
    address: ownAddress,
    addressType: 'NativeSegWit',
    network: BitcoinNetwork.Testnet,
    account: 0,
    chain: 0,
    index: 0,
    publicKeyHex:
      '03797dd653040d344fd048c1ad05d4cbcb2178b30c6a0c4276994795f3e833da41',
  },
  getCurrentFeeMarket: () =>
    of({
      unwrap: () => ({
        fast: { feeRate: 0.001, targetConfirmationTime: 60 },
        standard: { feeRate: 0.0005, targetConfirmationTime: 600 },
        slow: { feeRate: 0.0001, targetConfirmationTime: 6000 },
      }),
    }),
  ...walletOverrides,
});

const makeDeps = (
  utxos: BitcoinUTxO[],
  walletOverrides: Record<string, unknown> = {},
): SideEffectDependencies =>
  ({
    bitcoinAccountWallets$: of({
      [testAccountId]: makeMockWallet(utxos, walletOverrides),
    }),
    logger,
  } as unknown as SideEffectDependencies);

const toPendingActivities$ = (
  pendingByAccount: Record<string, Activity[]> = {},
) => of(pendingByAccount as PendingActivitiesByAccount);

describe('makeBuildTx in-flight wiring (bitcoin)', () => {
  const buildParams = makeBuildParams(1_000_000n);

  it('builds successfully when no pending activities exist', async () => {
    const deps = makeDeps([
      makeUtxo({ txId: previousTxIdA, index: 0, satoshis: 10_000_000 }),
    ]);
    const buildTx = makeBuildTx(deps, toPendingActivities$());
    const result = await firstValueFrom(buildTx(buildParams));
    expect(result.success).toBe(true);
  });

  it('excludes in-flight-consumed inputs from UTXO selection', async () => {
    const deps = makeDeps([
      makeUtxo({ txId: previousTxIdA, index: 0, satoshis: 10_000_000 }),
      makeUtxo({ txId: previousTxIdA, index: 1, satoshis: 1_000 }),
    ]);
    const buildTx = makeBuildTx(
      deps,
      toPendingActivities$({
        [testAccountId]: [
          inFlight({
            consumedInputs: [{ txId: previousTxIdA, index: 0 }],
            producedOutputs: [],
          }),
        ],
      }),
    );
    const result = await firstValueFrom(buildTx(buildParams));
    expect(result.success).toBe(false);
  });

  it('does not surface own in-flight outputs to the coin selector', async () => {
    const changeUtxo = makeUtxo({
      txId: previousTxIdB,
      index: 0,
      satoshis: 10_000_000,
    });
    const deps = makeDeps([]);
    const buildTx = makeBuildTx(
      deps,
      toPendingActivities$({
        [testAccountId]: [
          inFlight({
            consumedInputs: [],
            producedOutputs: [changeUtxo],
          }),
        ],
      }),
    );
    const result = await firstValueFrom(buildTx(buildParams));
    expect(result.success).toBe(false);
  });

  it('ignores pending activities belonging to a different account', async () => {
    const otherAccount = AccountId('other');
    const deps = makeDeps([
      makeUtxo({ txId: previousTxIdA, index: 0, satoshis: 10_000_000 }),
    ]);
    const buildTx = makeBuildTx(
      deps,
      toPendingActivities$({
        [otherAccount]: [
          inFlight({
            consumedInputs: [{ txId: previousTxIdA, index: 0 }],
            producedOutputs: [],
          }),
        ],
      }),
    );
    const result = await firstValueFrom(buildTx(buildParams));
    expect(result.success).toBe(true);
  });
});

describe('makeBuildTx previous transaction embedding (bitcoin)', () => {
  const masterFingerprint = 'f23f9fd2';
  const ownOutputScript = bitcoinAddress.toOutputScript(
    ownAddress,
    networks.testnet,
  );

  const makeRawPreviousTx = (satoshisPerOutput: number[], seed: number) => {
    const tx = new Transaction();
    tx.version = 2;
    tx.addInput(Buffer.alloc(32, seed), 0);
    for (const satoshis of satoshisPerOutput) {
      tx.addOutput(ownOutputScript, satoshis);
    }
    return { rawTxHex: tx.toHex(), txId: tx.getId() };
  };

  const previousTxA = makeRawPreviousTx([10_000_000, 5_000_000], 1);
  const previousTxB = makeRawPreviousTx([8_000_000], 2);
  const rawTxHexByTxId: Record<string, string> = {
    [previousTxA.txId]: previousTxA.rawTxHex,
    [previousTxB.txId]: previousTxB.rawTxHex,
  };

  const hardwareUtxos = [
    makeUtxo({ txId: previousTxA.txId, index: 0, satoshis: 10_000_000 }),
    makeUtxo({ txId: previousTxA.txId, index: 1, satoshis: 5_000_000 }),
    makeUtxo({ txId: previousTxB.txId, index: 0, satoshis: 8_000_000 }),
  ];

  it('embeds nonWitnessUtxo for every input of a hardware account, fetching shared previous txs once', async () => {
    const getRawTransaction = vi.fn((txId: string) =>
      of(Ok(rawTxHexByTxId[txId])),
    );
    const deps = makeDeps(hardwareUtxos, {
      masterFingerprint,
      getRawTransaction,
    });
    const buildTx = makeBuildTx(deps, toPendingActivities$());

    const result = await firstValueFrom(buildTx(makeBuildParams(20_000_000n)));

    expect(result.success).toBe(true);
    if (!result.success) throw new Error('Expected a successful build');

    const { context: psbt } = decodeUnsignedTxFromString(
      HexBytes(result.serializedTx),
    );
    expect(psbt.data.inputs).toHaveLength(3);
    psbt.txInputs.forEach((input, index) => {
      const txId = Buffer.from(input.hash).reverse().toString('hex');
      expect(psbt.data.inputs[index].witnessUtxo).toBeDefined();
      expect(psbt.data.inputs[index].nonWitnessUtxo).toEqual(
        Buffer.from(rawTxHexByTxId[txId], 'hex'),
      );
    });

    expect(getRawTransaction).toHaveBeenCalledTimes(2);
    expect(getRawTransaction).toHaveBeenCalledWith(previousTxA.txId);
    expect(getRawTransaction).toHaveBeenCalledWith(previousTxB.txId);
  });

  it('does not fetch previous transactions nor embed nonWitnessUtxo for in-memory accounts', async () => {
    const getRawTransaction = vi.fn((txId: string) =>
      of(Ok(rawTxHexByTxId[txId])),
    );
    const deps = makeDeps(hardwareUtxos, { getRawTransaction });
    const buildTx = makeBuildTx(deps, toPendingActivities$());

    const result = await firstValueFrom(buildTx(makeBuildParams(20_000_000n)));

    expect(result.success).toBe(true);
    if (!result.success) throw new Error('Expected a successful build');

    const { context: psbt } = decodeUnsignedTxFromString(
      HexBytes(result.serializedTx),
    );
    for (const input of psbt.data.inputs) {
      expect(input.nonWitnessUtxo).toBeUndefined();
    }
    expect(getRawTransaction).not.toHaveBeenCalled();
  });

  it('fails the build when a fetched previous transaction does not hash to the requested txid', async () => {
    const getRawTransaction = vi.fn((txId: string) =>
      of(
        Ok(
          txId === previousTxA.txId
            ? previousTxB.rawTxHex
            : rawTxHexByTxId[txId],
        ),
      ),
    );
    const deps = makeDeps(hardwareUtxos, {
      masterFingerprint,
      getRawTransaction,
    });
    const buildTx = makeBuildTx(deps, toPendingActivities$());

    const result = await firstValueFrom(buildTx(makeBuildParams(20_000_000n)));

    expect(result).toEqual({
      success: false,
      errorTranslationKey: 'tx-executor.building-error.generic',
    });
  });

  it('fails the build through the error translation path when a previous tx fetch fails', async () => {
    const getRawTransaction = vi.fn(() =>
      of(
        Err(
          new ProviderError(
            ProviderFailure.ConnectionFailure,
            undefined,
            'Raw tx fetch failed',
          ),
        ),
      ),
    );
    const deps = makeDeps(hardwareUtxos, {
      masterFingerprint,
      getRawTransaction,
    });
    const buildTx = makeBuildTx(deps, toPendingActivities$());

    const result = await firstValueFrom(buildTx(makeBuildParams(20_000_000n)));

    expect(result).toEqual({
      success: false,
      errorTranslationKey: 'tx-executor.building-error.generic',
    });
  });
});
