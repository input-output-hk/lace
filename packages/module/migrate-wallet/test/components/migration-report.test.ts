import { describe, expect, it } from 'vitest';

import { buildMigrationReport } from '../../src/components/migration-report';

const base = {
  mode: 'preserve' as const,
  network: 'cardano-preprod',
  source: { name: 'Old wallet', type: 'InMemory' },
  destination: { name: 'Ledger', type: 'HardwareLedger' },
};

describe('buildMigrationReport', () => {
  it('states each transaction with the account pair and address it paid', () => {
    const report = buildMigrationReport({
      ...base,
      transactions: [
        {
          index: 0,
          txId: 'tx-a',
          sourceAccountIndex: 0,
          destinationAccountIndex: 1,
          destinationAddress: 'addr_test1a',
        },
        {
          index: 1,
          txId: 'tx-b',
          sourceAccountIndex: 1,
          destinationAccountIndex: 2,
          destinationAddress: 'addr_test1b',
        },
      ],
    });
    expect(report).toContain('1. tx-a');
    expect(report).toContain('source account 0 -> destination account 1');
    expect(report).toContain('paid to addr_test1a');
    expect(report).toContain('2. tx-b');
    expect(report).toContain(
      'OK: no transaction spends from more than one source account.',
    );
    expect(report).toContain(
      'OK: each source account paid a destination no other source paid.',
    );
  });

  // The bug that motivated the report: preserve mode silently degraded to one
  // destination when the destination accounts were never derived, so two
  // source accounts paid the same address and were linked on-chain. The report
  // must name that rather than repeat the wizard's intent.
  it('reports a problem when two source accounts pay the same destination', () => {
    const report = buildMigrationReport({
      ...base,
      transactions: [
        {
          index: 0,
          txId: 'tx-a',
          sourceAccountIndex: 0,
          destinationAccountIndex: 0,
          destinationAddress: 'addr_test1same',
        },
        {
          index: 1,
          txId: 'tx-b',
          sourceAccountIndex: 1,
          destinationAccountIndex: 0,
          destinationAddress: 'addr_test1same',
        },
      ],
    });
    expect(report).toContain(
      'PROBLEM: addr_test1same received from source accounts 0, 1',
    );
    expect(report).not.toContain('OK: each source account paid');
    expect(report).toContain('Distinct destinations paid: 1');
  });

  it('reports a problem when one transaction spends from two source accounts', () => {
    const report = buildMigrationReport({
      ...base,
      transactions: [
        {
          index: 0,
          txId: 'tx-shared',
          sourceAccountIndex: 0,
          destinationAccountIndex: 1,
          destinationAddress: 'addr_test1a',
        },
        {
          index: 0,
          txId: 'tx-shared',
          sourceAccountIndex: 1,
          destinationAccountIndex: 2,
          destinationAddress: 'addr_test1b',
        },
      ],
    });
    expect(report).toContain(
      'PROBLEM: tx-shared spends from source accounts 0, 1',
    );
  });

  it('omits findings for a consolidated sweep, where one destination is the point', () => {
    const report = buildMigrationReport({
      ...base,
      mode: 'consolidate',
      transactions: [{ index: 0, txId: 'tx-a' }],
    });
    expect(report).toContain('Mode: consolidate');
    expect(report).not.toContain('Findings');
    expect(report).toContain('1. tx-a');
  });

  /**
   * Index 0 is the case that misled a reader in QA: a bare index rendered
   * "Source accounts not migrated: 0", which reads as "none", directly above a
   * line that IS a count ("Source accounts migrated: 1"). Index 0 collides with
   * the count reading, and account 0 is retained whenever it holds no
   * spendable UTxOs.
   */
  it('names a retained account 0 as an account, not a bare zero', () => {
    const report = buildMigrationReport({
      ...base,
      transactions: [
        {
          index: 0,
          txId: 'tx-a',
          sourceAccountIndex: 2,
          destinationAccountIndex: 3,
          destinationAddress: 'addr_test1a',
        },
      ],
      retainedSourceAccountIndexes: [0],
    });
    expect(report).toContain('Source accounts not migrated: account 0');
    expect(report).not.toContain('Source accounts not migrated: 0');
  });

  it('lists retained source accounts and the rewards set-up outcome', () => {
    const report = buildMigrationReport({
      ...base,
      transactions: [
        {
          index: 0,
          txId: 'tx-a',
          sourceAccountIndex: 0,
          destinationAccountIndex: 1,
          destinationAddress: 'addr_test1a',
        },
      ],
      retainedSourceAccountIndexes: [2, 1],
      rewardsSetup: { status: 'undelegated', transactions: [] },
    });
    expect(report).toContain(
      'Source accounts not migrated: account 1, account 2',
    );
    expect(report).toContain('Status: undelegated');
    expect(report).toContain('Rewards set-up transactions (0)');
  });

  // The count the user checked by hand: a preserved migration into three
  // accounts registers and delegates three stake keys, so three transactions
  // follow the three transfers — six in total, all of them listed.
  it('states one rewards set-up transaction per destination account', () => {
    const report = buildMigrationReport({
      ...base,
      transactions: [
        {
          index: 0,
          txId: 'tx-a',
          sourceAccountIndex: 0,
          destinationAccountIndex: 2,
          destinationAddress: 'addr_test1a',
        },
        {
          index: 1,
          txId: 'tx-b',
          sourceAccountIndex: 1,
          destinationAccountIndex: 3,
          destinationAddress: 'addr_test1b',
        },
      ],
      rewardsSetup: {
        status: 'delegated',
        transactions: [
          { txId: 'setup-a', destinationAccountIndex: 2 },
          { txId: 'setup-b', destinationAccountIndex: 3 },
        ],
      },
    });
    expect(report).toContain('Rewards set-up transactions (2)');
    expect(report).toContain('1. setup-a');
    expect(report).toContain(
      '   registers and delegates destination account 2',
    );
    expect(report).toContain('2. setup-b');
    expect(report).toContain(
      'OK: every destination that received funds has its own rewards set-up transaction.',
    );
  });

  // The failure the per-account record exists to expose: the outcome reports
  // "delegated" off the last account alone, so a set-up that ran for one
  // destination and not the other reads as complete without this.
  it('reports a problem when a destination that received funds was never set up', () => {
    const report = buildMigrationReport({
      ...base,
      transactions: [
        {
          index: 0,
          txId: 'tx-a',
          sourceAccountIndex: 0,
          destinationAccountIndex: 2,
          destinationAddress: 'addr_test1a',
        },
        {
          index: 1,
          txId: 'tx-b',
          sourceAccountIndex: 1,
          destinationAccountIndex: 3,
          destinationAddress: 'addr_test1b',
        },
      ],
      rewardsSetup: {
        status: 'delegated',
        transactions: [{ txId: 'setup-a', destinationAccountIndex: 2 }],
      },
    });
    expect(report).toContain(
      'PROBLEM: destination accounts 3 received funds but have no rewards set-up transaction.',
    );
    expect(report).not.toContain('OK: every destination that received funds');
  });

  it('records that nothing was submitted rather than omitting the section', () => {
    const report = buildMigrationReport({ ...base, transactions: [] });
    expect(report).toContain('Transfer transactions (0)');
    expect(report).toContain('none recorded');
  });
});
