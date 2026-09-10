import { Cardano } from '@cardano-sdk/core';
import { CardanoNetworkId } from '@lace-contract/cardano-context';
import { Ok } from '@lace-lib/util';
import { of, Subject, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makeResolveDestinationTargets } from '../../src/store/side-effects/resolve-destination-targets';
import { migrateWalletActions } from '../../src/store/slice';

import type { AnyWallet } from '@lace-contract/wallet-repo';

const exportedIndexes: number[] = [];
/** Set by a test to make the next export fail the way a real device would. */
const deviceFailure: { current: Error | undefined } = { current: undefined };
/** Set by a test to fail the freshness walk instead — no device involved. */
const providerFailure: { current: Error | undefined } = { current: undefined };
vi.mock('../../src/store/side-effects/device-account-source', () => ({
  makeDeviceAccountSource: vi.fn(async () => ({
    xpubForIndex: vi.fn(async (accountIndex: number) => {
      // Thrown raw: the destination probe tags at its own call site, so these
      // tests exercise the production tagging, not a mock's imitation of it.
      if (deviceFailure.current !== undefined) throw deviceFailure.current;
      if (!exportedIndexes.includes(accountIndex)) {
        exportedIndexes.push(accountIndex);
      }
      return 'xpub-hex';
    }),
    accountsForIndex: () => [],
  })),
}));

const NETWORK_ID = CardanoNetworkId(Cardano.ChainIds.Preprod.networkMagic);
const UNUSED_ADDRESS =
  'addr_test1qpfhhfy2qgls50r9u4yh0l7z67xpg0a5rrhkmvzcuqrd0znuzcjqw982pcftgx53fu5527z2cj2tkx2h8ux2vxsg475q9gw0lz';
const USED_ADDRESS =
  'addr_test1qphhr294v0w0rzgk7kz4ynsp8hwt82ha6nsp8yk6h04fhzsuryus5g7pm3lq85msee5pdtqlnv2crdc83kk2tvhsefcsu2snle';
const REWARD_ACCOUNT =
  'stake_test1up7pvfq8zn4quy45r2g572290p9vf99mr9tn7r9xrgy2l2qdsf58d';

const discovered = (addressBech32: string) => ({
  address: addressBech32,
  data: {
    accountIndex: 0,
    index: 0,
    networkId: 0,
    rewardAccount: REWARD_ACCOUNT,
    type: 0,
    stakeKeyDerivationPath: { index: 0, role: 2 },
  },
});

/** Reports the given indexes as used on chain, everything else as never seen. */
const providerWith = (usedIndexes: Set<number>) => ({
  discoverAddresses: vi.fn(({ accountIndex }: { accountIndex: number }) =>
    providerFailure.current === undefined
      ? of(
          Ok(
            discovered(
              usedIndexes.has(accountIndex) ? USED_ADDRESS : UNUSED_ADDRESS,
            ),
          ),
        )
      : throwError(() => providerFailure.current),
  ),
  getRewardAccountInfo: vi.fn(() =>
    of(Ok({ isRegistered: false, withdrawableAmount: 0n })),
  ),
  getAccountUtxos: vi.fn(() => of(Ok([]))),
  getAddressTransactionHistory: vi.fn(({ address }: { address: string }) =>
    of(Ok(address === USED_ADDRESS ? [{ txId: 'tx1' }] : [])),
  ),
});

/** Hardware destination: no encrypted root, so only the device can export. */
const destinationWallet = {
  walletId: 'destination-wallet',
  type: 'HardwareLedger',
  accounts: [
    {
      accountId: 'destination-account',
      blockchainName: 'Cardano',
      blockchainNetworkId: NETWORK_ID,
      blockchainSpecific: {
        accountIndex: 0,
        extendedAccountPublicKey: 'xpub0',
      },
    },
  ],
} as unknown as AnyWallet;

const mappingRow = (destinationAccountIndex: number) => ({
  sourceAccountIndex: 0,
  destinationAccountIndex,
  coin: '1000000',
  assetCount: 0,
  utxoCount: 1,
});

const run = async (
  usedIndexes: Set<number>,
  {
    mapping = [mappingRow(1)] as ReturnType<typeof mappingRow>[],
    migrationMode = 'preserve' as 'consolidate' | 'preserve',
  } = {},
) => {
  const trigger = new Subject<
    ReturnType<
      typeof migrateWalletActions.migrateWallet.destinationDeviceConnected
    >
  >();
  const emissions: { type: string; payload?: unknown }[] = [];
  const sub = makeResolveDestinationTargets()(
    {
      migrateWallet: {
        destinationDeviceConnected$: trigger.asObservable(),
      },
    } as never,
    {
      migrateWallet: {
        selectAccountMapping$: of(mapping),
        selectDestinationWalletId$: of('destination-wallet'),
        selectDestinationAccountId$: of('destination-account'),
        selectMigrationMode$: of(migrationMode),
      },
      wallets: { selectAll$: of([destinationWallet]) },
    } as never,
    {
      logger: { warn: vi.fn(), debug: vi.fn(), error: vi.fn(), info: vi.fn() },
      cardanoProvider: providerWith(usedIndexes),
      actions: migrateWalletActions,
      __getState: vi.fn(),
      loadModules: vi.fn(),
    } as never,
  ).subscribe(action => emissions.push(action));

  trigger.next(
    migrateWalletActions.migrateWallet.destinationDeviceConnected({
      device: { optionId: 'ledger', blockchainName: 'Cardano' } as never,
    }),
  );
  await new Promise(resolve => setTimeout(resolve, 500));
  sub.unsubscribe();
  return emissions;
};

describe('makeResolveDestinationTargets', () => {
  beforeEach(() => {
    exportedIndexes.length = 0;
    deviceFailure.current = undefined;
    providerFailure.current = undefined;
  });

  /**
   * The gap this closes: a hardware destination has no encrypted root, so
   * `freshDestinationMapping$` skips it at discovery and the review named
   * indexes that were arithmetic. Here index 1 is used on chain, so the plan is
   * rewritten to 2 BEFORE the review states it.
   */
  it('walks past a planned index that is used on chain and rewrites the plan', async () => {
    const emissions = await run(new Set([0, 1]));
    const resolved = emissions.find(
      ({ type }) => type === 'migrateWallet/destinationTargetsResolved',
    )?.payload as {
      resolvedDestinationIndexes: number[];
      accountMapping: { destinationAccountIndex: number }[];
    };
    expect(resolved.resolvedDestinationIndexes).toEqual([2]);
    // The review will name 2, which was checked — not the 1 the plan guessed.
    expect(resolved.accountMapping[0].destinationAccountIndex).toBe(2);
  });

  /**
   * Consolidate probes and rewrites the row the SWEEP will land on. A
   * rewards-only row carries no probed index, so the sweep skips it — and this
   * resolver rewriting row 0 instead left the review naming a checked account
   * while the funds went to an unchecked one.
   */
  it('probes and rewrites the row a consolidating sweep lands on', async () => {
    const rewardsOnlyRow = { ...mappingRow(0), utxoCount: 0, coin: '0' };
    // 0 and 1 both used: the walk starts at the wallet's lowest loaded index
    // (0), so both must be taken for it to move to 2.
    const emissions = await run(new Set([0, 1]), {
      mapping: [rewardsOnlyRow, mappingRow(1)],
      migrationMode: 'consolidate',
    });
    const resolved = emissions.find(
      ({ type }) => type === 'migrateWallet/destinationTargetsResolved',
    )?.payload as {
      resolvedDestinationIndexes: number[];
      accountMapping: { destinationAccountIndex: number }[];
    };
    // The planned index is used on chain, so the walk moves to 2 …
    expect(resolved.resolvedDestinationIndexes).toEqual([2]);
    // … and 2 is written onto the landing row, leaving the rewards-only row
    // (which the sweep never pays) untouched.
    expect(resolved.accountMapping[1].destinationAccountIndex).toBe(2);
    expect(resolved.accountMapping[0].destinationAccountIndex).toBe(0);
  });

  /**
   * The device problems the picker already names — locked, app closed,
   * unplugged — reach this step too, and a terminal failure screen for them
   * would strand a migration that has moved nothing.
   */
  it('sends a locked device back to the connect screen, naming the problem', async () => {
    deviceFailure.current = new Error(
      'Cannot communicate with Ledger Cardano App due to DeviceStatusError: General error 0x5515',
    );
    const emissions = await run(new Set([0, 1]));
    expect(emissions.map(({ type }) => type)).toEqual([
      'migrateWallet/destinationDeviceFailed',
    ]);
    expect(
      (emissions[0].payload as { deviceHintKey: string }).deviceHintKey,
    ).toBe('hw-error.device-locked.subtitle');
  });

  /**
   * A device failure no category matches is still a device failure, and the
   * fix is still on the user's desk. Before, an unclassified one fell through
   * to the terminal screen because the tag only survived when a specific hint
   * existed.
   */
  it('returns an unclassifiable device failure to the connect screen too', async () => {
    deviceFailure.current = new Error('something went sideways on the device');
    const emissions = await run(new Set([0, 1]));
    expect(emissions.map(({ type }) => type)).toEqual([
      'migrateWallet/destinationDeviceFailed',
    ]);
    expect(
      (emissions[0].payload as { deviceHintKey: string }).deviceHintKey,
    ).toBe('hw-error.generic.subtitle');
  });

  /**
   * Only DEVICE problems are recoverable this way. A provider error is not
   * something reconnecting will mend, so it still fails the step.
   */
  it('still fails the step for a problem no device raised', async () => {
    providerFailure.current = new Error('Blockfrost returned 500');
    const emissions = await run(new Set([0, 1]));
    expect(emissions.map(({ type }) => type)).toEqual([
      'migrateWallet/stepFailed',
    ]);
  });

  /**
   * Provider messages that read like device failures must still fail the
   * step — why the hint travels by identity, not keyword (`classifyDeviceHint`).
   */
  it.each([
    ['a cancelled provider request', 'Blockfrost request cancelled'],
    ['a rejected node call', 'submission rejected by the node'],
    ['a dropped socket', 'socket disconnected'],
  ])(
    'fails the step for %s, which reads like a device error',
    async (_label, message) => {
      providerFailure.current = new Error(message);
      const emissions = await run(new Set([0, 1]));
      expect(emissions.map(({ type }) => type)).toEqual([
        'migrateWallet/stepFailed',
      ]);
    },
  );

  it('keeps the planned index when the chain has never seen it', async () => {
    const emissions = await run(new Set());
    const resolved = emissions.find(
      ({ type }) => type === 'migrateWallet/destinationTargetsResolved',
    )?.payload as { resolvedDestinationIndexes: number[] };
    // Account 0 is loaded and unused, so it is the target: no account to
    // create, and its key came off the wallet rather than an approval.
    expect(resolved.resolvedDestinationIndexes).toEqual([0]);
    expect(exportedIndexes).toEqual([]);
  });
});
