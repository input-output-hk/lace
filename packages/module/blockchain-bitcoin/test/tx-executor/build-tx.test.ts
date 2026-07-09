import { ActivityType } from '@lace-contract/activities';
import {
  BITCOIN_TOKEN_ID,
  BitcoinNetwork,
} from '@lace-contract/bitcoin-context';
import { AccountId } from '@lace-contract/wallet-repo';
import { BigNumber, Timestamp } from '@lace-sdk/util';
import { firstValueFrom, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

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

describe('makeBuildTx in-flight wiring (bitcoin)', () => {
  const tokenTransfer = {
    normalizedAmount: BigNumber(1_000_000n),
    token: {
      accountId: testAccountId,
      blockchainName: 'Bitcoin',
      tokenId: BITCOIN_TOKEN_ID,
    },
  } as unknown as TokenTransfer;

  const buildParams = {
    accountId: testAccountId,
    blockchainName: 'Bitcoin',
    serializedTx: '',
    blockchainSpecificSendFlowData: {},
    txParams: [
      {
        address: recipientAddress,
        tokenTransfers: [tokenTransfer],
        blockchainSpecific: {
          memo: '',
          feeRate: { feeOption: 'Low' as const },
        },
      },
    ],
  } as unknown as BuildTxParamsShape;

  const logger = {
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    trace: vi.fn(),
  };

  const makeMockWallet = (utxos: BitcoinUTxO[]) => ({
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
  });

  const makeDeps = (utxos: BitcoinUTxO[]): SideEffectDependencies =>
    ({
      bitcoinAccountWallets$: of({
        [testAccountId]: makeMockWallet(utxos),
      }),
      logger,
    } as unknown as SideEffectDependencies);

  const toPendingActivities$ = (
    pendingByAccount: Record<string, Activity[]> = {},
  ) => of(pendingByAccount as PendingActivitiesByAccount);

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
