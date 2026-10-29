import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  accountId,
  accountState,
  collateralFunding,
  controlUtxo,
  custodyAccount,
  deviceAccountPublicKey,
  expectSuccess,
  fakeProvider,
  feeFunding,
  fundUtxo,
  grantUtxo,
  granteeKeyHash,
  identity,
  logicRewardAccountOf,
  lovelaceGrant,
  recipientAddress,
  runBuild,
  transactionOf,
} from './fixtures';

import type { ChainFixture } from './fixtures';
import type { finalizeCustodyBuild } from '../../../src/store/custody/custody-validation';
import type { Serialization } from '@cardano-sdk/core';
import type {
  CardanoCustodyAccountOperation,
  CardanoCustodyBuildResult,
} from '@lace-contract/cardano-context';

type CustodyBuildExpectation = Parameters<typeof finalizeCustodyBuild>[2];

// The fee sponsor refuses every transaction that draws from the logic's
// reward account, and finalizeCustodyBuild applies its rules, so these
// tests replace the final checks to see where the builders route a draw.
const finalized = vi.hoisted(
  () => [] as { expectation: CustodyBuildExpectation }[],
);
vi.mock('../../../src/store/custody/custody-validation', () => ({
  finalizeCustodyBuild: (
    {
      transaction,
      resolvedInputs,
    }: {
      transaction: Serialization.Transaction;
      resolvedInputs: CardanoCustodyBuildResult['resolvedInputs'];
    },
    _chain: unknown,
    expectation: CustodyBuildExpectation,
  ): CardanoCustodyBuildResult => {
    finalized.push({ expectation });
    return {
      transaction: transaction.toCbor(),
      bodyHash: transaction.getId(),
      resolvedInputs,
      accountRecord: expectation.record,
      fee: transaction.body().fee(),
      invalidHereafter: transaction.body().toCore().validityInterval!
        .invalidHereafter!,
    };
  },
}));

/** What anyone can credit to the logic's reward account, such as a pool's deposit refund. */
const DRAWN = 1_500_000n;
const logicWithBalance: ChainFixture = {
  logicRewardAccount: { isRegistered: true, withdrawableAmount: DRAWN },
};

const bodyOf = (result: CardanoCustodyBuildResult) =>
  transactionOf(result).body().toCore();

const lastExpectation = () => finalized.at(-1)!.expectation;

const accountOutputsOf = (result: CardanoCustodyBuildResult) =>
  bodyOf(result).outputs.filter(({ address }) => address === identity.address);

beforeEach(() => {
  finalized.length = 0;
});

describe('a draw from the logic reward account', () => {
  it('joins the control output of a creation, at no cost to the sponsor', async () => {
    const { provider } = fakeProvider(logicWithBalance);
    const funding = feeFunding();
    const result = expectSuccess(
      await runBuild(
        {
          requestId: 'create',
          operation: {
            type: 'create',
            deviceAccountPublicKey: await deviceAccountPublicKey(),
          },
          funding,
        },
        { provider },
      ),
    );
    const body = bodyOf(result);
    const [control, change] = body.outputs;
    expect(body.withdrawals).toEqual([
      { stakeAddress: logicRewardAccountOf(), quantity: DRAWN },
    ]);
    const sponsored = funding.feeUtxo[1].value.coins - change.value.coins;
    expect(sponsored).toBe(funding.maxSponsoredLovelace - 100_000n);
    expect(control.value.coins).toBe(sponsored - 2_000_000n - body.fee + DRAWN);
    expect(lastExpectation().control?.lovelace).toBe(control.value.coins);
  });

  describe('owner operations', () => {
    const run = async (
      operation: CardanoCustodyAccountOperation,
      {
        funds,
        chain = {},
      }: { funds: ReturnType<typeof fundUtxo>[]; chain?: ChainFixture },
    ) => {
      const state = accountState({ nextSlot: 1n, outstanding: 1n });
      const utxos = [
        controlUtxo(state, { coins: 3_000_000n }),
        ...funds,
        grantUtxo(lovelaceGrant()),
      ];
      const { provider } = fakeProvider({
        utxosAt: address => (address === identity.address ? utxos : []),
        ...logicWithBalance,
        ...chain,
      });
      return expectSuccess(
        await runBuild(
          {
            requestId: 'owner',
            accountId,
            operation,
            funding: collateralFunding(),
          },
          { provider, store: { settledUtxos: utxos } },
        ),
      );
    };

    it('returns to the account as change when plain funds pay', async () => {
      const result = await run(
        { type: 'revoke-grant', slot: 0n },
        { funds: [fundUtxo(1, 20_000_000n)] },
      );
      const body = bodyOf(result);
      const [control, ...change] = accountOutputsOf(result);
      expect(control.value.coins).toBe(3_000_000n);
      expect(change.map(({ value }) => value.coins)).toEqual([
        20_000_000n + DRAWN - body.fee,
      ]);
      expect(lastExpectation().outflow?.withdrawal).toBe(DRAWN);
    });

    it('joins the control output when its headroom pays', async () => {
      const result = await run(
        { type: 'revoke-grant', slot: 0n },
        { funds: [] },
      );
      const body = bodyOf(result);
      expect(body.inputs).toHaveLength(1);
      expect(accountOutputsOf(result).map(({ value }) => value.coins)).toEqual([
        3_000_000n + DRAWN - body.fee,
      ]);
      expect(lastExpectation().control?.lovelace).toBe(
        3_000_000n + DRAWN - body.fee,
      );
    });

    it('returns to the account beside the withdrawn rewards', async () => {
      const result = await run(
        { type: 'withdraw-rewards' },
        {
          funds: [],
          chain: {
            rewardAccount: () => ({
              isRegistered: true,
              withdrawableAmount: 10_000_000n,
            }),
          },
        },
      );
      const body = bodyOf(result);
      expect(body.withdrawals).toEqual(
        expect.arrayContaining([
          { stakeAddress: logicRewardAccountOf(), quantity: DRAWN },
          { stakeAddress: identity.rewardAccount, quantity: 10_000_000n },
        ]),
      );
      const [, change] = accountOutputsOf(result);
      expect(change.value.coins).toBe(10_000_000n + DRAWN - body.fee);
      expect(lastExpectation().outflow?.withdrawal).toBe(10_000_000n + DRAWN);
    });
  });

  it('returns to the account as the change of a grant spend, leaving the caps to the outputs and the fee', async () => {
    const grant = lovelaceGrant();
    const state = accountState({ nextSlot: 1n, outstanding: 1n });
    const utxos = [
      controlUtxo(state),
      grantUtxo(grant),
      fundUtxo(1, 20_000_000n),
    ];
    const { provider } = fakeProvider({
      utxosAt: address => (address === identity.address ? utxos : []),
      ...logicWithBalance,
    });
    const result = expectSuccess(
      await runBuild(
        {
          requestId: 'spend',
          accountId,
          operation: {
            type: 'grant-spend',
            grantee: granteeKeyHash,
            outputs: [
              { address: recipientAddress, value: { coins: 5_000_000n } },
            ],
          },
          funding: collateralFunding(),
        },
        {
          provider,
          store: {
            settledUtxos: utxos,
            account: custodyAccount(null as never),
          },
        },
      ),
    );
    const body = bodyOf(result);
    const [, change] = accountOutputsOf(result);
    expect(change.value.coins).toBe(
      20_000_000n - 5_000_000n + DRAWN - body.fee,
    );
    const { grantSpend, outflow } = lastExpectation();
    expect(outflow?.withdrawal).toBe(DRAWN);
    // The second build's caps: the outputs, the fee and its margin.
    expect(grantSpend?.after.scope.cap).toBe(
      grant.scope.cap - 5_000_000n - body.fee - 10_000n,
    );
  });
});
