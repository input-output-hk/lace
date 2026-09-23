import { ActivityType } from '@lace-contract/activities';
import {
  MidnightSDKNetworkIds,
  toUnshieldedTokenType,
} from '@lace-contract/midnight-context';
import { TokenId } from '@lace-contract/tokens';
import { BigNumber } from '@lace-lib/util';
import { describe, expect, it } from 'vitest';

import {
  buildTokenBalanceChangesFromUtxos,
  deriveUnshieldedActivity,
  entryHasUnshieldedActivity,
  formatFee,
  getAddressFromUtxos,
  mapStatusToActivityType,
} from '../../../src/store/utils/activities';

import type { WalletEntry } from '@midnightntwrk/wallet-sdk';

const networkId = MidnightSDKNetworkIds.Preview;

const utxoOf = (value: bigint, owner = 'a', tokenType = 'NIGHT') => ({
  value,
  owner,
  tokenType,
  intentHash: 'h',
  outputIndex: 0,
});

describe('buildTokenBalanceChangesFromUtxos', () => {
  it('aggregates net amounts by token type from created and spent UTXOs', () => {
    const createdUtxos = [
      {
        value: 100n,
        owner: 'addr_1',
        tokenType: 'type_a',
        intentHash: '',
        outputIndex: 0,
      },
      {
        value: 50n,
        owner: 'addr_3',
        tokenType: 'type_a',
        intentHash: '',
        outputIndex: 0,
      },
    ];
    const spentUtxos = [
      {
        value: 30n,
        owner: 'addr_2',
        tokenType: 'type_a',
        intentHash: '',
        outputIndex: 0,
      },
    ];

    const result = buildTokenBalanceChangesFromUtxos(
      createdUtxos,
      spentUtxos,
      networkId,
    );

    expect(result).toHaveLength(1);
    expect(result[0].tokenId).toBe(
      TokenId(toUnshieldedTokenType('type_a', networkId)),
    );
    expect(result[0].amount).toEqual(BigNumber(120n)); // 100 + 50 - 30
  });

  it('includes multiple token types when UTXOs span different tokens', () => {
    const createdUtxos = [
      {
        value: 100n,
        owner: 'addr_1',
        tokenType: 'type_a',
        intentHash: '',
        outputIndex: 0,
      },
      {
        value: 200n,
        owner: 'addr_2',
        tokenType: 'type_b',
        intentHash: '',
        outputIndex: 0,
      },
    ];
    const spentUtxos: readonly {
      value: bigint;
      owner: string;
      tokenType: string;
    }[] = [];

    const result = buildTokenBalanceChangesFromUtxos(
      createdUtxos,
      spentUtxos,
      networkId,
    );

    expect(result).toHaveLength(2);
    const typeA = result.find(
      r => r.tokenId === TokenId(toUnshieldedTokenType('type_a', networkId)),
    );
    const typeB = result.find(
      r => r.tokenId === TokenId(toUnshieldedTokenType('type_b', networkId)),
    );
    expect(typeA?.amount).toEqual(BigNumber(100n));
    expect(typeB?.amount).toEqual(BigNumber(200n));
  });

  it('omits token types with zero net change', () => {
    const createdUtxos = [
      {
        value: 100n,
        owner: 'addr_1',
        tokenType: 'type_a',
        intentHash: '',
        outputIndex: 0,
      },
    ];
    const spentUtxos = [
      {
        value: 100n,
        owner: 'addr_2',
        tokenType: 'type_a',
        intentHash: '',
        outputIndex: 0,
      },
    ];

    const result = buildTokenBalanceChangesFromUtxos(
      createdUtxos,
      spentUtxos,
      networkId,
    );

    expect(result).toHaveLength(0);
  });

  it('returns negative amount when spent exceeds created for a token', () => {
    const createdUtxos: readonly {
      value: bigint;
      owner: string;
      tokenType: string;
    }[] = [];
    const spentUtxos = [
      {
        value: 50n,
        owner: 'addr_1',
        tokenType: 'type_a',
        intentHash: '',
        outputIndex: 0,
      },
    ];

    const result = buildTokenBalanceChangesFromUtxos(
      createdUtxos,
      spentUtxos,
      networkId,
    );

    expect(result).toHaveLength(1);
    expect(result[0].amount).toEqual(BigNumber(-50n));
  });

  it('handles string value (schema decode)', () => {
    const createdUtxos = [
      {
        value: '100',
        owner: 'addr_1',
        tokenType: 'type_a',
        intentHash: '',
        outputIndex: 0,
      },
    ];
    const spentUtxos: readonly {
      value: bigint;
      owner: string;
      tokenType: string;
    }[] = [];

    const result = buildTokenBalanceChangesFromUtxos(
      createdUtxos,
      spentUtxos,
      networkId,
    );

    expect(result).toHaveLength(1);
    expect(result[0].amount).toEqual(BigNumber(100n));
  });

  it('returns empty array for empty created and spent', () => {
    const result = buildTokenBalanceChangesFromUtxos([], [], networkId);
    expect(result).toEqual([]);
  });
});

describe('getAddressFromUtxos', () => {
  it('returns owner of first created UTXO', () => {
    const createdUtxos = [
      {
        value: 100n,
        owner: 'addr_1',
        tokenType: 'type_a',
        intentHash: '',
        outputIndex: 0,
      },
      {
        value: 200n,
        owner: 'addr_2',
        tokenType: 'type_b',
        intentHash: '',
        outputIndex: 0,
      },
    ];
    const spentUtxos: readonly {
      value: bigint;
      owner: string;
      tokenType: string;
    }[] = [];

    const result = getAddressFromUtxos(createdUtxos, spentUtxos);

    expect(result).toBe('addr_1');
  });

  it('returns owner of first spent UTXO when no created', () => {
    const createdUtxos: readonly {
      value: bigint;
      owner: string;
      tokenType: string;
    }[] = [];
    const spentUtxos = [
      {
        value: 50n,
        owner: 'addr_spent',
        tokenType: 'type_a',
        intentHash: '',
        outputIndex: 0,
      },
    ];

    const result = getAddressFromUtxos(createdUtxos, spentUtxos);

    expect(result).toBe('addr_spent');
  });

  it('returns empty string when both arrays empty', () => {
    const result = getAddressFromUtxos([], []);

    expect(result).toBe('');
  });
});

describe('mapStatusToActivityType', () => {
  it('maps SUCCESS with no balance changes (undefined) to ActivityType.Receive', () => {
    expect(mapStatusToActivityType('SUCCESS')).toBe(ActivityType.Receive);
  });

  it('maps SUCCESS with empty balance changes to ActivityType.Receive', () => {
    expect(mapStatusToActivityType('SUCCESS', [])).toBe(ActivityType.Receive);
  });

  it('maps SUCCESS with all positive balance changes to ActivityType.Receive', () => {
    const changes = [{ amount: BigNumber(100n) }, { amount: BigNumber(50n) }];
    expect(mapStatusToActivityType('SUCCESS', changes)).toBe(
      ActivityType.Receive,
    );
  });

  it('maps SUCCESS with a negative balance change to ActivityType.Send', () => {
    const changes = [{ amount: BigNumber(-100n) }];
    expect(mapStatusToActivityType('SUCCESS', changes)).toBe(ActivityType.Send);
  });

  it('maps SUCCESS with mixed balance changes to ActivityType.Receive when any is positive', () => {
    const changes = [{ amount: BigNumber(-100n) }, { amount: BigNumber(10n) }];
    expect(mapStatusToActivityType('SUCCESS', changes)).toBe(
      ActivityType.Receive,
    );
  });

  it('maps FAILURE to ActivityType.Failed', () => {
    expect(mapStatusToActivityType('FAILURE')).toBe(ActivityType.Failed);
  });

  it('maps PARTIAL_SUCCESS with no balance changes (undefined) to ActivityType.Receive', () => {
    expect(mapStatusToActivityType('PARTIAL_SUCCESS')).toBe(
      ActivityType.Receive,
    );
  });

  it('maps PARTIAL_SUCCESS with a negative balance change to ActivityType.Send', () => {
    const changes = [{ amount: BigNumber(-100n) }];
    expect(mapStatusToActivityType('PARTIAL_SUCCESS', changes)).toBe(
      ActivityType.Send,
    );
  });

  it('maps PARTIAL_SUCCESS with a positive balance change to ActivityType.Receive', () => {
    const changes = [{ amount: BigNumber(100n) }];
    expect(mapStatusToActivityType('PARTIAL_SUCCESS', changes)).toBe(
      ActivityType.Receive,
    );
  });

  it('maps PARTIAL_SUCCESS with mixed balance changes to ActivityType.Receive when any is positive', () => {
    const changes = [{ amount: BigNumber(-100n) }, { amount: BigNumber(10n) }];
    expect(mapStatusToActivityType('PARTIAL_SUCCESS', changes)).toBe(
      ActivityType.Receive,
    );
  });
});

describe('formatFee', () => {
  it('returns string representation of bigint fees', () => {
    expect(formatFee(100n)).toBe('100');
  });

  it('returns "0" when fees is null', () => {
    expect(formatFee(null)).toBe('0');
  });

  it('returns "0" when fees is undefined', () => {
    expect(
      formatFee(undefined as unknown as Parameters<typeof formatFee>[0]),
    ).toBe('0');
  });
});

describe('entryHasUnshieldedActivity', () => {
  const utxo = utxoOf(1n, 'a', 't');
  const entry = (unshielded: WalletEntry['unshielded']): WalletEntry =>
    ({
      hash: 'h',
      protocolVersion: 1,
      status: 'SUCCESS',
      unshielded,
    } as WalletEntry);

  it('is true when there are created unshielded UTxOs', () => {
    expect(
      entryHasUnshieldedActivity(
        entry({ id: 1, createdUtxos: [utxo], spentUtxos: [] }),
      ),
    ).toBe(true);
  });

  it('is true when there are spent unshielded UTxOs', () => {
    expect(
      entryHasUnshieldedActivity(
        entry({ id: 1, createdUtxos: [], spentUtxos: [utxo] }),
      ),
    ).toBe(true);
  });

  it('is true for a self-transfer, whose UTxOs net to zero', () => {
    expect(
      entryHasUnshieldedActivity(
        entry({ id: 1, createdUtxos: [utxo], spentUtxos: [utxo] }),
      ),
    ).toBe(true);
  });

  it('is false when the unshielded section is empty (shielded-only)', () => {
    expect(
      entryHasUnshieldedActivity(
        entry({ id: 1, createdUtxos: [], spentUtxos: [] }),
      ),
    ).toBe(false);
  });

  it('is false when there is no unshielded section', () => {
    expect(entryHasUnshieldedActivity(entry(undefined))).toBe(false);
  });
});

describe('deriveUnshieldedActivity', () => {
  it('classifies a net-positive movement as Receive', () => {
    const result = deriveUnshieldedActivity({
      status: 'SUCCESS',
      createdUtxos: [utxoOf(100n)],
      spentUtxos: [],
      networkId,
    });
    expect(result.type).toBe(ActivityType.Receive);
    expect(result.tokenBalanceChanges).toEqual(
      buildTokenBalanceChangesFromUtxos([utxoOf(100n)], [], networkId),
    );
  });

  it('classifies a net-negative movement as Send', () => {
    const result = deriveUnshieldedActivity({
      status: 'SUCCESS',
      createdUtxos: [utxoOf(30n)],
      spentUtxos: [utxoOf(100n)],
      networkId,
    });
    expect(result.type).toBe(ActivityType.Send);
  });

  it('classifies a net-zero movement as Self with no amount', () => {
    const result = deriveUnshieldedActivity({
      status: 'SUCCESS',
      createdUtxos: [utxoOf(100n)],
      spentUtxos: [utxoOf(100n)],
      networkId,
    });
    expect(result.type).toBe(ActivityType.Self);
    expect(result.tokenBalanceChanges).toEqual([]);
  });

  it('classifies a net-zero PARTIAL_SUCCESS movement as Self', () => {
    const result = deriveUnshieldedActivity({
      status: 'PARTIAL_SUCCESS',
      createdUtxos: [utxoOf(100n)],
      spentUtxos: [utxoOf(100n)],
      networkId,
    });
    expect(result.type).toBe(ActivityType.Self);
  });

  it('keeps FAILURE as Failed even when net-zero', () => {
    const result = deriveUnshieldedActivity({
      status: 'FAILURE',
      createdUtxos: [utxoOf(100n)],
      spentUtxos: [utxoOf(100n)],
      networkId,
    });
    expect(result.type).toBe(ActivityType.Failed);
  });

  it('classifies no movement as Receive, not Self', () => {
    const result = deriveUnshieldedActivity({
      status: 'SUCCESS',
      createdUtxos: [],
      spentUtxos: [],
      networkId,
    });
    expect(result.type).toBe(ActivityType.Receive);
    expect(result.tokenBalanceChanges).toEqual([]);
  });
});
