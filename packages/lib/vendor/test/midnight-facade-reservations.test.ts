import { WalletFacade } from '@midnightntwrk/wallet-sdk/facade';
import { NEVER } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { withReservationRelease } from '../src/midnight-facade-reservations';

import type { BalancingRecipe } from '@midnightntwrk/wallet-sdk/facade';

// Ledger transactions stand in as named values whose merge and bind record
// what was combined, so a recipe reads as the steps that built it.
type FakeTx = {
  id: string;
  merge: (other: FakeTx) => FakeTx;
  bind: () => FakeTx;
};
const fakeTx = (id: string): FakeTx => ({
  id,
  merge: other => fakeTx(`${id}+${other.id}`),
  bind: () => fakeTx(`${id}:bound`),
});

type Failure = 'dust' | 'shielded' | 'unshielded';

// Sub-wallets that reserve on every build step, as wallet SDK 3.1 does, except
// unshielded balancing of an unbound transaction, which adds inputs to the
// transaction itself without reserving them. They record what is reverted.
// `idle` makes a step find nothing to balance.
const createSubWallets = ({
  fail,
  idle = [],
}: { fail?: Failure; idle?: Array<'shielded' | 'unshielded'> } = {}) => {
  const reverted: string[] = [];
  const step = (kind: 'shielded' | 'unshielded', id: string) => {
    if (fail === kind) throw new Error(`${kind} failed`);
    return idle.includes(kind) ? undefined : fakeTx(id);
  };
  const revertTransaction =
    (kind: string) =>
    async (transaction: FakeTx): Promise<void> => {
      reverted.push(`${kind}:${transaction.id}`);
    };
  return {
    reverted,
    shielded: {
      balanceTransaction: vi.fn(async () => step('shielded', 'S')),
      initSwap: vi.fn(async () => step('shielded', 'S-swap')),
      transferTransaction: vi.fn(async () => step('shielded', 'S-transfer')),
      revertTransaction: vi.fn(revertTransaction('shielded')),
    },
    unshielded: {
      balanceFinalizedTransaction: vi.fn(async () => step('unshielded', 'U')),
      balanceUnboundTransaction: vi.fn(
        async (transaction: FakeTx) =>
          step('unshielded', `${transaction.id}+U-inputs`) ?? transaction,
      ),
      initSwap: vi.fn(async () => step('unshielded', 'U-swap')),
      transferTransaction: vi.fn(async () => step('unshielded', 'U-transfer')),
      revertTransaction: vi.fn(revertTransaction('unshielded')),
    },
    dust: {
      balanceTransactions: vi.fn(
        async (_key: unknown, transactions: FakeTx[]) => {
          if (fail === 'dust') throw new Error('Insufficient DUST');
          return fakeTx(`fee(${transactions.map(t => t.id).join(',')})`);
        },
      ),
      revertTransaction: vi.fn(revertTransaction('dust')),
    },
    provingService: {
      prove: vi.fn(async (transaction: FakeTx) =>
        fakeTx(`${transaction.id}:proved`),
      ),
    },
  };
};

// The wallet SDK's own facade over the fake sub-wallets: what Lace's builders
// must match on success.
const createFacade = async (subWallets: ReturnType<typeof createSubWallets>) =>
  WalletFacade.init({
    configuration: {} as never,
    shielded: () => subWallets.shielded as never,
    unshielded: () => subWallets.unshielded as never,
    dust: () => subWallets.dust as never,
    submissionService: () => ({} as never),
    pendingTransactionsService: () =>
      ({
        state: () => NEVER,
        addPendingTransaction: async () => undefined,
        clear: async () => undefined,
      } as never),
    provingService: () => subWallets.provingService as never,
  });

const ids = (recipe: BalancingRecipe) =>
  JSON.parse(
    JSON.stringify(recipe, (_key, value: unknown) =>
      value && typeof value === 'object' && 'id' in value
        ? (value as FakeTx).id
        : value,
    ),
  ) as unknown;

const keys = { shieldedSecretKeys: {}, dustSecretKey: {} } as never;
const ttl = new Date('2030-01-01T00:00:00Z');
const dappTx = () => fakeTx('dapp') as never;
const swapInputs = {
  shielded: { aa: 1n },
  unshielded: { bb: 2n },
} as never;
const swapOutputs = [
  { type: 'shielded', outputs: [{ type: 'aa', amount: 1n }] },
  { type: 'unshielded', outputs: [{ type: 'bb', amount: 2n }] },
] as never;
const feeVariants = [
  { label: 'without the fee', options: { payFees: false } },
  { label: 'with the fee', options: { payFees: true } },
];

type BuildOptions = { tokenKinds?: never; payFees?: boolean };
type Operation = {
  name: string;
  variants: Array<{ label: string; options: BuildOptions }>;
  lace: (
    facade: WalletFacade,
    options: BuildOptions,
  ) => Promise<BalancingRecipe>;
  sdk: (
    facade: WalletFacade,
    options: BuildOptions,
  ) => Promise<BalancingRecipe>;
};

const balanceVariants = [
  { label: 'every kind and the fee', options: {} },
  { label: 'the fee only', options: { tokenKinds: ['dust'] as never } },
  {
    label: 'tokens without the fee',
    options: { tokenKinds: ['shielded', 'unshielded'] as never },
  },
];

const operations: Operation[] = [
  {
    name: 'balanceFinalizedTransaction',
    variants: balanceVariants,
    lace: async (facade, { tokenKinds }) =>
      withReservationRelease(facade).balanceFinalizedTransaction(
        dappTx(),
        keys,
        {
          ttl,
          tokenKindsToBalance: tokenKinds,
        },
      ),
    sdk: async (facade, { tokenKinds }) =>
      facade.balanceFinalizedTransaction(dappTx(), keys, {
        ttl,
        tokenKindsToBalance: tokenKinds,
      }),
  },
  {
    name: 'balanceUnboundTransaction',
    variants: balanceVariants,
    lace: async (facade, { tokenKinds }) =>
      withReservationRelease(facade).balanceUnboundTransaction(dappTx(), keys, {
        ttl,
        tokenKindsToBalance: tokenKinds,
      }),
    sdk: async (facade, { tokenKinds }) =>
      facade.balanceUnboundTransaction(dappTx(), keys, {
        ttl,
        tokenKindsToBalance: tokenKinds,
      }),
  },
  {
    name: 'transferTransaction',
    variants: feeVariants,
    lace: async (facade, { payFees }) =>
      withReservationRelease(facade).transferTransaction(swapOutputs, keys, {
        ttl,
        payFees,
      }),
    sdk: async (facade, { payFees }) =>
      facade.transferTransaction(swapOutputs, keys, { ttl, payFees }),
  },
  {
    name: 'initSwap',
    variants: feeVariants,
    lace: async (facade, { payFees }) =>
      withReservationRelease(facade).initSwap(
        { desiredInputs: swapInputs, desiredOutputs: swapOutputs },
        keys,
        { ttl, payFees },
      ),
    sdk: async (facade, { payFees }) =>
      facade.initSwap(swapInputs, swapOutputs, keys, { ttl, payFees }),
  },
];

const outcome = async (build: () => Promise<BalancingRecipe>) =>
  build().then(
    recipe => ({ recipe: ids(recipe) }),
    (error: Error) => ({ error: error.message }),
  );

describe('Midnight builds that release their reservations', () => {
  describe.each(operations)('$name', operation => {
    it.each(operation.variants)(
      'builds what the wallet SDK builds: $label',
      async ({ options }) => {
        for (const idle of [[], ['shielded'], ['unshielded']] as const) {
          const laceWallets = createSubWallets({ idle: [...idle] });
          const sdkWallets = createSubWallets({ idle: [...idle] });
          const lace = await outcome(async () =>
            operation.lace(await createFacade(laceWallets), options),
          );
          const sdk = await outcome(async () =>
            operation.sdk(await createFacade(sdkWallets), options),
          );
          expect(lace).toEqual(sdk);
          expect(laceWallets.reverted).toEqual([]);
        }
      },
    );
  });

  // A transfer always builds its outputs; the others can find nothing to do.
  it.each(
    operations.filter(operation => operation.name !== 'transferTransaction'),
  )(
    '$name reports the same error as the wallet SDK when nothing needs balancing',
    async operation => {
      const options = { tokenKinds: ['shielded', 'unshielded'] as never };
      const idle: Array<'shielded' | 'unshielded'> = ['shielded', 'unshielded'];
      const lace = await outcome(async () =>
        operation.lace(await createFacade(createSubWallets({ idle })), options),
      );
      const sdk = await outcome(async () =>
        operation.sdk(await createFacade(createSubWallets({ idle })), options),
      );
      expect(lace).toEqual(sdk);
    },
  );

  it.each([
    {
      name: 'balanceFinalizedTransaction',
      build: async (facade: WalletFacade) =>
        withReservationRelease(facade).balanceFinalizedTransaction(
          dappTx(),
          keys,
          { ttl },
        ),
      released: ['unshielded:U', 'shielded:S'],
    },
    {
      name: 'balanceUnboundTransaction',
      build: async (facade: WalletFacade) =>
        withReservationRelease(facade).balanceUnboundTransaction(
          dappTx(),
          keys,
          { ttl },
        ),
      // The dApp's transaction holds unshielded inputs balancing added
      // without reserving them, and maybe coins an earlier build reserved.
      released: ['shielded:S'],
    },
    {
      name: 'transferTransaction',
      build: async (facade: WalletFacade) =>
        withReservationRelease(facade).transferTransaction(swapOutputs, keys, {
          ttl,
        }),
      released: ['shielded:S-transfer', 'unshielded:U-transfer'],
    },
    {
      name: 'initSwap',
      build: async (facade: WalletFacade) =>
        withReservationRelease(facade).initSwap(
          { desiredInputs: swapInputs, desiredOutputs: swapOutputs },
          keys,
          {
            ttl,
            payFees: true,
          },
        ),
      released: ['shielded:S-swap', 'unshielded:U-swap'],
    },
  ])(
    '$name releases every reservation when the fee cannot be paid',
    async ({ build, released }) => {
      const subWallets = createSubWallets({ fail: 'dust' });
      await expect(build(await createFacade(subWallets))).rejects.toThrow(
        'Insufficient DUST',
      );
      expect([...subWallets.reverted].sort()).toEqual([...released].sort());
    },
  );

  it('the wallet SDK itself keeps those reservations', async () => {
    const subWallets = createSubWallets({ fail: 'dust' });
    const facade = await createFacade(subWallets);
    await expect(
      facade.balanceFinalizedTransaction(dappTx(), keys, { ttl }),
    ).rejects.toThrow('Insufficient DUST');
    expect(subWallets.reverted).toEqual([]);
  });

  it('releases the steps already taken when a later token step fails', async () => {
    const finalized = createSubWallets({ fail: 'shielded' });
    await expect(
      withReservationRelease(
        await createFacade(finalized),
      ).balanceFinalizedTransaction(dappTx(), keys, {
        ttl,
      }),
    ).rejects.toThrow('shielded failed');
    expect(finalized.reverted).toEqual(['unshielded:U']);

    const swap = createSubWallets({ fail: 'unshielded' });
    await expect(
      withReservationRelease(await createFacade(swap)).initSwap(
        { desiredInputs: swapInputs, desiredOutputs: swapOutputs },
        keys,
        {
          ttl,
        },
      ),
    ).rejects.toThrow('unshielded failed');
    expect(swap.reverted).toEqual(['shielded:S-swap']);

    const unbound = createSubWallets({ fail: 'unshielded' });
    await expect(
      withReservationRelease(
        await createFacade(unbound),
      ).balanceUnboundTransaction(dappTx(), keys, {
        ttl,
      }),
    ).rejects.toThrow('unshielded failed');
    expect(unbound.reverted).toEqual(['shielded:S']);

    const transfer = createSubWallets({ fail: 'unshielded' });
    await expect(
      withReservationRelease(await createFacade(transfer)).transferTransaction(
        swapOutputs,
        keys,
        { ttl },
      ),
    ).rejects.toThrow('unshielded failed');
    expect(transfer.reverted).toEqual(['shielded:S-transfer']);
  });

  it('returns the build error when a release fails too', async () => {
    const subWallets = createSubWallets({ fail: 'dust' });
    subWallets.unshielded.revertTransaction.mockRejectedValueOnce(
      new Error('revert failed'),
    );
    await expect(
      withReservationRelease(
        await createFacade(subWallets),
      ).balanceFinalizedTransaction(dappTx(), keys, {
        ttl,
      }),
    ).rejects.toThrow('Insufficient DUST');
    expect(subWallets.reverted).toEqual(['shielded:S']);
  });
});
