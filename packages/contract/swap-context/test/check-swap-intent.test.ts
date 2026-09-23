import { LOVELACE_TOKEN_ID } from '@lace-contract/cardano-context';
import { TokenId } from '@lace-contract/tokens';
import { HexBytes } from '@lace-lib/util';
import { describe, expect, it } from 'vitest';

import {
  SWAP_ADA_HEADROOM_LOVELACE,
  SWAP_COLLATERAL_CEILING_LOVELACE,
  SWAP_FEE_CEILING_LOVELACE,
  inspectSwapTransaction,
} from '../src/check-swap-intent';

import {
  BUY_TOKEN,
  DEPOSIT,
  DREP_VOTE,
  HONEST_FEE,
  INFO_PROPOSAL,
  ORDER_SCRIPT_ADDRESS,
  OTHER_TOKEN,
  OWN_ADDRESS,
  OWN_PAYMENT_HASH,
  OWN_STAKE_HASH,
  PARTNER_ADDRESS,
  REWARD_ACCOUNT,
  SELL_LOVELACE,
  SELL_TOKEN,
  STAKE_REGISTRATION,
  beneficiaryDatum,
  buildSwapTx,
  datumHashOf,
  foreignInput,
  honestAdaOrder,
  ownUtxo,
} from './fixtures/swap-tx-fixtures';

import type { SwapIntent, SwapTxViolationCode } from '../src/check-swap-intent';
import type { Cardano } from '@cardano-sdk/core';
import type { CardanoPaymentAddress } from '@lace-contract/cardano-context';

const ADA_SELL_INTENT: SwapIntent = {
  buyTokenId: BUY_TOKEN,
  deposit: { amount: String(DEPOSIT) },
  expectedBuyAmount: '1000',
  sellAmount: String(SELL_LOVELACE),
  sellTokenId: 'lovelace',
};

const TOKEN_SELL_INTENT: SwapIntent = {
  buyTokenId: 'lovelace',
  expectedBuyAmount: '40000000',
  sellAmount: '500',
  sellTokenId: SELL_TOKEN,
};

const ADA_ALLOWANCE =
  SELL_LOVELACE + HONEST_FEE + DEPOSIT + SWAP_ADA_HEADROOM_LOVELACE;

/** Above the headroom, as a split route's stacked batcher fees are in practice. */
const QUOTED_FEE = 4_000_000n;
const ADA_SELL_INTENT_WITH_FEES: SwapIntent = {
  ...ADA_SELL_INTENT,
  fees: [{ amount: String(QUOTED_FEE), tokenId: 'lovelace' }],
};
const ADA_ALLOWANCE_WITH_FEES = ADA_ALLOWANCE + QUOTED_FEE;

const inspect = ({
  serializedTx,
  accountUtxos,
  intent = ADA_SELL_INTENT,
  slippagePercent = 1,
}: {
  serializedTx: HexBytes;
  accountUtxos: readonly Cardano.Utxo[];
  intent?: SwapIntent;
  slippagePercent?: number;
}) =>
  inspectSwapTransaction({
    accountAddresses: [OWN_ADDRESS as unknown as CardanoPaymentAddress],
    accountUtxos,
    intent,
    serializedTx,
    slippagePercent,
  });

const codes = (inspection: {
  violations: readonly { code: SwapTxViolationCode }[];
}): SwapTxViolationCode[] =>
  inspection.violations.map(violation => violation.code);

describe('inspectSwapTransaction', () => {
  describe('an order-based swap', () => {
    it('passes a build that spends the sell amount into an order naming the account', () => {
      const inspection = inspect(honestAdaOrder());

      expect(inspection.verdict).toBe('ok');
      expect(inspection.kind).toBe('order');
      expect(inspection.warnings).toEqual([]);
      expect(inspection.violations).toEqual([]);
      // The bought asset is delivered later, so it is not in these bytes.
      expect(inspection.receivedAmount).toBeUndefined();
      expect(inspection.minimumReceived).toBe('990');
      expect(inspection.outflows).toEqual([
        {
          amount: String(SELL_LOVELACE + DEPOSIT + HONEST_FEE),
          tokenId: LOVELACE_TOKEN_ID,
        },
      ]);
      expect(inspection.feeLovelace).toBe(String(HONEST_FEE));
      expect(inspection.ttl).toBe(12_345);
    });

    it('allows the batcher and service fees the quote declares', () => {
      const inspection = inspect({
        ...honestAdaOrder({ quotedFeeLovelace: QUOTED_FEE }),
        intent: ADA_SELL_INTENT_WITH_FEES,
      });

      expect(inspection.violations).toEqual([]);
      expect(inspection.verdict).toBe('ok');
    });

    it('blocks one lovelace beyond the allowance the declared fees widen', () => {
      const inspection = inspect({
        ...honestAdaOrder({
          orderCoin: ADA_ALLOWANCE_WITH_FEES + 1n - HONEST_FEE - QUOTED_FEE,
          quotedFeeLovelace: QUOTED_FEE,
        }),
        intent: ADA_SELL_INTENT_WITH_FEES,
      });

      expect(codes(inspection)).toEqual(['adaOutflowExceeded']);
      expect(inspection.verdict).toBe('blocked');
    });

    it('accepts exactly the allowance the declared fees widen', () => {
      expect(
        inspect({
          ...honestAdaOrder({
            orderCoin: ADA_ALLOWANCE_WITH_FEES - HONEST_FEE - QUOTED_FEE,
            quotedFeeLovelace: QUOTED_FEE,
          }),
          intent: ADA_SELL_INTENT_WITH_FEES,
        }).verdict,
      ).toBe('ok');
    });

    it('blocks a fee inflated far past anything a build needs', () => {
      // Not also `adaOutflowExceeded`: the fee widens the allowance by exactly
      // what it adds to the outflow.
      const inspection = inspect(honestAdaOrder({ fee: 50_000_000n }));

      expect(codes(inspection)).toEqual(['feeExceeded']);
      expect(inspection.verdict).toBe('blocked');
    });

    it('accepts a fee at exactly the ceiling', () => {
      const inspection = inspect(
        honestAdaOrder({ fee: SWAP_FEE_CEILING_LOVELACE }),
      );

      expect(inspection.violations).toEqual([]);
      expect(inspection.feeLovelace).toBe(String(SWAP_FEE_CEILING_LOVELACE));
    });

    it('blocks a fee one lovelace beyond the ceiling', () => {
      const inspection = inspect(
        honestAdaOrder({ fee: SWAP_FEE_CEILING_LOVELACE + 1n }),
      );

      expect(codes(inspection)).toEqual(['feeExceeded']);
    });

    it('does not widen the ADA allowance for a fee quoted in another token', () => {
      const inspection = inspect({
        ...honestAdaOrder({ quotedFeeLovelace: QUOTED_FEE }),
        intent: {
          ...ADA_SELL_INTENT,
          fees: [{ amount: String(QUOTED_FEE), tokenId: SELL_TOKEN }],
        },
      });

      expect(codes(inspection)).toEqual(['adaOutflowExceeded']);
    });

    it('warns when an order datum names only the account stake credential', () => {
      // An attacker's payment key beside our stake key: the datum carries a
      // hash of ours, but the fulfilment pays them.
      const inspection = inspect(
        honestAdaOrder({ datum: beneficiaryDatum(OWN_STAKE_HASH) }),
      );

      expect(inspection.warnings).toContain('beneficiaryUnverified');
    });

    it('finds the payment credential beside a stake one, as a real address carries both', () => {
      const inspection = inspect(
        honestAdaOrder({
          datum: beneficiaryDatum(OWN_PAYMENT_HASH, OWN_STAKE_HASH),
        }),
      );

      expect(inspection.warnings).toEqual([]);
    });

    it('blocks an ADA outflow one lovelace beyond the allowance', () => {
      const inspection = inspect(
        honestAdaOrder({ orderCoin: ADA_ALLOWANCE + 1n - HONEST_FEE }),
      );

      expect(codes(inspection)).toEqual(['adaOutflowExceeded']);
      expect(inspection.verdict).toBe('blocked');
    });

    it('accepts an ADA outflow at exactly the allowance', () => {
      expect(
        inspect(honestAdaOrder({ orderCoin: ADA_ALLOWANCE - HONEST_FEE }))
          .verdict,
      ).toBe('ok');
    });

    it('blocks when less ADA leaves than the user agreed to sell', () => {
      const inspection = inspect(honestAdaOrder({ orderCoin: 50_000_000n }));

      expect(codes(inspection)).toEqual(['sellAmountMismatch']);
    });

    it('blocks when the account ends up with more ADA than it started with', () => {
      const funding = ownUtxo(0, { coins: 1_000_000n });
      const inspection = inspect({
        accountUtxos: [funding],
        // A foreign input funds an own output: nothing of the sale happens.
        serializedTx: buildSwapTx({
          fee: HONEST_FEE,
          inputs: [funding[0], foreignInput(1)],
          outputs: [{ address: OWN_ADDRESS, value: { coins: 5_000_000n } }],
        }),
      });

      expect(codes(inspection)).toEqual(['sellAmountMismatch']);
    });

    it('blocks any outflow of a token the swap does not sell', () => {
      const funding = ownUtxo(0, {
        assets: new Map([[OTHER_TOKEN, 5n]]),
        coins: 200_000_000n,
      });
      const inspection = inspect({
        accountUtxos: [funding],
        serializedTx: buildSwapTx({
          fee: HONEST_FEE,
          inputs: [funding[0]],
          outputs: [
            {
              address: ORDER_SCRIPT_ADDRESS,
              datum: beneficiaryDatum(),
              // The order takes the account's unrelated token with it.
              value: {
                assets: new Map([[OTHER_TOKEN, 5n]]),
                coins: SELL_LOVELACE + DEPOSIT,
              },
            },
            {
              address: OWN_ADDRESS,
              value: {
                coins: 200_000_000n - SELL_LOVELACE - DEPOSIT - HONEST_FEE,
              },
            },
          ],
        }),
      });

      expect(codes(inspection)).toEqual(['unexpectedTokenOutflow']);
      expect(inspection.violations[0].detail).toContain(OTHER_TOKEN);
    });

    it('blocks a smuggled certificate', () => {
      const funding = ownUtxo(0, { coins: 200_000_000n });
      const inspection = inspect({
        accountUtxos: [funding],
        serializedTx: buildSwapTx({
          certificates: [STAKE_REGISTRATION],
          fee: HONEST_FEE,
          inputs: [funding[0]],
          outputs: [
            {
              address: ORDER_SCRIPT_ADDRESS,
              datum: beneficiaryDatum(),
              value: { coins: SELL_LOVELACE + DEPOSIT },
            },
            {
              address: OWN_ADDRESS,
              value: {
                coins: 200_000_000n - SELL_LOVELACE - DEPOSIT - HONEST_FEE,
              },
            },
          ],
        }),
      });

      expect(codes(inspection)).toEqual(['certificatePresent']);
    });

    it('blocks a reward withdrawal riding along', () => {
      const funding = ownUtxo(0, { coins: 200_000_000n });
      const inspection = inspect({
        accountUtxos: [funding],
        serializedTx: buildSwapTx({
          fee: HONEST_FEE,
          inputs: [funding[0]],
          outputs: [
            {
              address: ORDER_SCRIPT_ADDRESS,
              datum: beneficiaryDatum(),
              value: { coins: SELL_LOVELACE + DEPOSIT },
            },
            {
              address: OWN_ADDRESS,
              value: {
                coins:
                  200_000_000n - SELL_LOVELACE - DEPOSIT - HONEST_FEE + 500n,
              },
            },
          ],
          withdrawals: [{ quantity: 500n, stakeAddress: REWARD_ACCOUNT }],
        }),
      });

      expect(codes(inspection)).toEqual(['withdrawalPresent']);
    });

    it('blocks a vote riding along on a swap', () => {
      const inspection = inspect(
        honestAdaOrder({ votingProcedures: DREP_VOTE }),
      );

      expect(codes(inspection)).toEqual(['governanceActionPresent']);
      expect(inspection.verdict).toBe('blocked');
    });

    it('blocks a governance proposal riding along on a swap', () => {
      const inspection = inspect(
        honestAdaOrder({ proposalProcedures: [INFO_PROPOSAL] }),
      );

      expect(codes(inspection)).toEqual(['governanceActionPresent']);
    });

    it('warns, without blocking, when the order datum names someone else', () => {
      const inspection = inspect(
        honestAdaOrder({ datum: beneficiaryDatum('de'.repeat(28)) }),
      );

      expect(inspection.verdict).toBe('ok');
      expect(inspection.warnings).toEqual(['beneficiaryUnverified']);
    });

    it('warns when the order output carries no datum at all', () => {
      const funding = ownUtxo(0, { coins: 200_000_000n });
      const inspection = inspect({
        accountUtxos: [funding],
        serializedTx: buildSwapTx({
          fee: HONEST_FEE,
          inputs: [funding[0]],
          outputs: [
            {
              address: ORDER_SCRIPT_ADDRESS,
              value: { coins: SELL_LOVELACE + DEPOSIT },
            },
            {
              address: OWN_ADDRESS,
              value: {
                coins: 200_000_000n - SELL_LOVELACE - DEPOSIT - HONEST_FEE,
              },
            },
          ],
        }),
      });

      expect(inspection.warnings).toEqual(['beneficiaryUnverified']);
    });

    it('resolves a datum the output references by hash', () => {
      const funding = ownUtxo(0, { coins: 200_000_000n });
      const datum = beneficiaryDatum();
      const inspection = inspect({
        accountUtxos: [funding],
        serializedTx: buildSwapTx({
          datums: [datum],
          fee: HONEST_FEE,
          inputs: [funding[0]],
          outputs: [
            {
              address: ORDER_SCRIPT_ADDRESS,
              datumHash: datumHashOf(datum),
              value: { coins: SELL_LOVELACE + DEPOSIT },
            },
            {
              address: OWN_ADDRESS,
              value: {
                coins: 200_000_000n - SELL_LOVELACE - DEPOSIT - HONEST_FEE,
              },
            },
          ],
        }),
      });

      expect(inspection.warnings).toEqual([]);
    });

    it('warns on a destination that is not a script, and still lists it', () => {
      const inspection = inspect(honestAdaOrder({ includePartnerFee: true }));

      expect(inspection.verdict).toBe('ok');
      expect(inspection.warnings).toEqual(['nonScriptDestination']);
      expect(
        inspection.destinations.map(destination => destination.address),
      ).toEqual([ORDER_SCRIPT_ADDRESS, PARTNER_ADDRESS]);
    });

    it('leaves own change out of the destination list', () => {
      expect(inspect(honestAdaOrder()).destinations).toHaveLength(1);
    });
  });

  describe('selling a token rather than ADA', () => {
    const tokenSellTx = ({
      sellTokenOut,
      lovelaceOverhead = HONEST_FEE,
    }: {
      sellTokenOut: bigint;
      lovelaceOverhead?: bigint;
    }) => {
      const funding = ownUtxo(0, {
        assets: new Map([[SELL_TOKEN, 500n]]),
        coins: 20_000_000n,
      });
      return {
        accountUtxos: [funding],
        serializedTx: buildSwapTx({
          fee: HONEST_FEE,
          inputs: [funding[0]],
          outputs: [
            {
              address: ORDER_SCRIPT_ADDRESS,
              datum: beneficiaryDatum(),
              value: {
                assets:
                  sellTokenOut > 0n
                    ? new Map([[SELL_TOKEN, sellTokenOut]])
                    : undefined,
                coins: lovelaceOverhead,
              },
            },
            {
              address: OWN_ADDRESS,
              value: {
                assets:
                  500n - sellTokenOut > 0n
                    ? new Map([[SELL_TOKEN, 500n - sellTokenOut]])
                    : undefined,
                coins: 20_000_000n - lovelaceOverhead - HONEST_FEE,
              },
            },
          ],
        }),
      };
    };

    it('passes when exactly the intended amount of the token leaves', () => {
      expect(
        inspect({
          ...tokenSellTx({ sellTokenOut: 500n }),
          intent: TOKEN_SELL_INTENT,
        }).verdict,
      ).toBe('ok');
    });

    it('blocks a build that burns the sell token instead of delivering it', () => {
      // Not also `sellAmountMismatch`: the outflow is exactly the sell amount.
      const funding = ownUtxo(0, {
        assets: new Map([[SELL_TOKEN, 500n]]),
        coins: 20_000_000n,
      });
      const inspection = inspect({
        accountUtxos: [funding],
        intent: TOKEN_SELL_INTENT,
        serializedTx: buildSwapTx({
          fee: HONEST_FEE,
          inputs: [funding[0]],
          mint: new Map([[SELL_TOKEN, -500n]]),
          outputs: [
            {
              address: ORDER_SCRIPT_ADDRESS,
              datum: beneficiaryDatum(),
              value: { coins: HONEST_FEE },
            },
            {
              address: OWN_ADDRESS,
              value: { coins: 20_000_000n - HONEST_FEE - HONEST_FEE },
            },
          ],
        }),
      });

      expect(codes(inspection)).toEqual(['mintPresent']);
      expect(inspection.verdict).toBe('blocked');
    });

    it('blocks a token minted straight to someone else', () => {
      // Nothing of the account's moves, so every balance clause stays silent.
      const inspection = inspect({
        ...honestAdaOrder({ mint: new Map([[OTHER_TOKEN, 1n]]) }),
        intent: ADA_SELL_INTENT,
      });

      expect(codes(inspection)).toEqual(['mintPresent']);
    });

    it('blocks a single extra unit of the sell token', () => {
      const funding = ownUtxo(0, {
        assets: new Map([[SELL_TOKEN, 501n]]),
        coins: 20_000_000n,
      });
      const inspection = inspect({
        accountUtxos: [funding],
        intent: TOKEN_SELL_INTENT,
        serializedTx: buildSwapTx({
          fee: HONEST_FEE,
          inputs: [funding[0]],
          outputs: [
            {
              address: ORDER_SCRIPT_ADDRESS,
              datum: beneficiaryDatum(),
              value: {
                assets: new Map([[SELL_TOKEN, 501n]]),
                coins: HONEST_FEE,
              },
            },
            {
              address: OWN_ADDRESS,
              value: { coins: 20_000_000n - HONEST_FEE - HONEST_FEE },
            },
          ],
        }),
      });

      expect(codes(inspection)).toEqual(['sellAmountMismatch']);
      expect(inspection.violations[0].detail).toContain('501 != 500');
    });

    it('blocks when the sell token never leaves', () => {
      const inspection = inspect({
        ...tokenSellTx({ sellTokenOut: 0n }),
        intent: TOKEN_SELL_INTENT,
      });

      expect(codes(inspection)).toEqual(['sellAmountMismatch']);
    });

    it('blocks a build that pays the sell token in rather than selling it', () => {
      const funding = ownUtxo(0, {
        assets: new Map([[SELL_TOKEN, 500n]]),
        coins: 20_000_000n,
      });
      const inspection = inspect({
        accountUtxos: [funding],
        intent: TOKEN_SELL_INTENT,
        serializedTx: buildSwapTx({
          fee: HONEST_FEE,
          inputs: [funding[0], foreignInput(1)],
          outputs: [
            {
              address: OWN_ADDRESS,
              value: {
                assets: new Map([[SELL_TOKEN, 900n]]),
                coins: 20_000_000n - HONEST_FEE,
              },
            },
          ],
        }),
      });

      expect(codes(inspection)).toEqual(['sellAmountMismatch']);
    });

    it('blocks a token-for-token sale whose inputs resolve to nothing this account owns', () => {
      // Buying a token rather than ADA keeps the zero buy-token net off the
      // atomic floor, so only the never-left clauses can catch this.
      const inspection = inspect({
        ...tokenSellTx({ sellTokenOut: 400n }),
        accountUtxos: [],
        intent: { ...TOKEN_SELL_INTENT, buyTokenId: BUY_TOKEN },
      });

      expect(inspection.verdict).toBe('blocked');
      expect(codes(inspection)).toEqual(['noOwnInputs', 'sellAmountMismatch']);
    });

    it('bounds ADA by fee, deposit and headroom when ADA is not the sell side', () => {
      const inspection = inspect({
        ...tokenSellTx({
          lovelaceOverhead: SWAP_ADA_HEADROOM_LOVELACE + 1n,
          sellTokenOut: 500n,
        }),
        intent: TOKEN_SELL_INTENT,
      });

      expect(codes(inspection)).toEqual(['adaOutflowExceeded']);
    });
  });

  describe('an atomic swap', () => {
    const atomicTx = ({ delivered }: { delivered: bigint }) => {
      const funding = ownUtxo(0, { coins: 200_000_000n });
      return {
        accountUtxos: [funding],
        serializedTx: buildSwapTx({
          fee: HONEST_FEE,
          // The pool UTxO is foreign by definition, and must not be counted.
          inputs: [funding[0], foreignInput(1)],
          outputs: [
            {
              address: OWN_ADDRESS,
              value: {
                assets: new Map([[BUY_TOKEN, delivered]]),
                coins: 200_000_000n - SELL_LOVELACE - HONEST_FEE,
              },
            },
          ],
        }),
      };
    };

    /**
     * Buying ADA, so the received lovelace is netted against everything this
     * account paid out of it. `poolDelivers` is the gross ADA the pool hands
     * over, before the transaction fee and the declared fee output.
     */
    const atomicAdaBuy = ({
      poolDelivers,
      quotedFeeLovelace,
    }: {
      poolDelivers: bigint;
      quotedFeeLovelace: bigint;
    }) => {
      const funding = ownUtxo(0, {
        assets: new Map([[SELL_TOKEN, 500n]]),
        coins: 5_000_000n,
      });
      return {
        accountUtxos: [funding],
        serializedTx: buildSwapTx({
          fee: HONEST_FEE,
          inputs: [funding[0], foreignInput(1)],
          outputs: [
            {
              address: OWN_ADDRESS,
              value: {
                coins:
                  5_000_000n + poolDelivers - HONEST_FEE - quotedFeeLovelace,
              },
            },
            { address: PARTNER_ADDRESS, value: { coins: quotedFeeLovelace } },
          ],
        }),
      };
    };

    it('credits the declared fees when checking an ADA delivery against the floor', () => {
      const inspection = inspect({
        ...atomicAdaBuy({
          poolDelivers: 40_000_000n,
          quotedFeeLovelace: 1_500_000n,
        }),
        intent: {
          ...TOKEN_SELL_INTENT,
          fees: [{ amount: '1500000', tokenId: 'lovelace' }],
        },
      });

      expect(inspection.kind).toBe('atomic');
      expect(inspection.violations).toEqual([]);
      expect(inspection.verdict).toBe('ok');
    });

    it('still blocks an ADA delivery short of the floor once the fees are credited', () => {
      const inspection = inspect({
        ...atomicAdaBuy({
          poolDelivers: 39_000_000n,
          quotedFeeLovelace: 1_500_000n,
        }),
        intent: {
          ...TOKEN_SELL_INTENT,
          fees: [{ amount: '1500000', tokenId: 'lovelace' }],
        },
      });

      expect(codes(inspection)).toEqual(['belowMinimumReceived']);
      expect(inspection.verdict).toBe('blocked');
    });

    it('reads the delivered amount from the transaction itself', () => {
      const inspection = inspect(atomicTx({ delivered: 995n }));

      expect(inspection.kind).toBe('atomic');
      expect(inspection.verdict).toBe('ok');
      expect(inspection.receivedAmount).toBe('995');
      expect(inspection.inflows).toEqual([
        { amount: '995', tokenId: TokenId(BUY_TOKEN) },
      ]);
      // An atomic swap proves its own delivery; no beneficiary datum needed.
      expect(inspection.warnings).toEqual([]);
      expect(inspection.destinations).toEqual([]);
    });

    it('blocks a delivery below the slippage floor', () => {
      const inspection = inspect(atomicTx({ delivered: 989n }));

      expect(codes(inspection)).toEqual(['belowMinimumReceived']);
      expect(inspection.violations[0].detail).toBe('989 < 990');
    });

    it('credits the fee back before judging an ADA delivery', () => {
      const funding = ownUtxo(0, {
        assets: new Map([[SELL_TOKEN, 500n]]),
        coins: 5_000_000n,
      });
      const inspection = inspect({
        accountUtxos: [funding],
        intent: TOKEN_SELL_INTENT,
        // 39.8 ADA net gain plus the 0.2 ADA fee is exactly the 40 ADA floor.
        serializedTx: buildSwapTx({
          fee: HONEST_FEE,
          inputs: [funding[0], foreignInput(1)],
          outputs: [
            {
              address: OWN_ADDRESS,
              value: { coins: 5_000_000n + 39_800_000n },
            },
          ],
        }),
        slippagePercent: 0,
      });

      expect(inspection.kind).toBe('atomic');
      expect(inspection.verdict).toBe('ok');
    });
  });

  it('blocks bytes that are not a transaction at all', () => {
    const inspection = inspect({
      accountUtxos: [],
      serializedTx: HexBytes('deadbeef'),
    });

    expect(inspection.verdict).toBe('blocked');
    expect(codes(inspection)).toEqual(['undecodable']);
    // The figures still describe the intent, so the review can render a reason.
    expect(inspection.minimumReceived).toBe('990');
  });

  it('blocks collateral far beyond what a failing script could ever take', () => {
    const funding = ownUtxo(0, { coins: 200_000_000n });
    const fatCollateral = ownUtxo(1, { coins: 500_000_000n });
    const inspection = inspect({
      accountUtxos: [funding, fatCollateral],
      serializedTx: buildSwapTx({
        collaterals: [fatCollateral[0]],
        fee: HONEST_FEE,
        inputs: [funding[0]],
        outputs: [
          {
            address: ORDER_SCRIPT_ADDRESS,
            datum: beneficiaryDatum(),
            value: { coins: SELL_LOVELACE + DEPOSIT },
          },
          {
            address: OWN_ADDRESS,
            value: {
              coins: 200_000_000n - SELL_LOVELACE - DEPOSIT - HONEST_FEE,
            },
          },
        ],
      }),
    });

    expect(codes(inspection)).toEqual(['collateralExceeded']);
    expect(inspection.verdict).toBe('blocked');
  });

  it('counts only the collateral a return does not pay back', () => {
    const funding = ownUtxo(0, { coins: 200_000_000n });
    const fatCollateral = ownUtxo(1, { coins: 500_000_000n });
    const inspection = inspect({
      accountUtxos: [funding, fatCollateral],
      serializedTx: buildSwapTx({
        // 497 ADA comes straight back to us, so only 3 is ever at risk.
        collateralReturn: {
          address: OWN_ADDRESS,
          value: { coins: 497_000_000n },
        },
        collaterals: [fatCollateral[0]],
        fee: HONEST_FEE,
        inputs: [funding[0]],
        outputs: [
          {
            address: ORDER_SCRIPT_ADDRESS,
            datum: beneficiaryDatum(),
            value: { coins: SELL_LOVELACE + DEPOSIT },
          },
          {
            address: OWN_ADDRESS,
            value: {
              coins: 200_000_000n - SELL_LOVELACE - DEPOSIT - HONEST_FEE,
            },
          },
        ],
      }),
    });

    expect(inspection.collateralLovelace).toBe('3000000');
    expect(inspection.violations).toEqual([]);
  });

  it('ignores a collateral return that pays someone else', () => {
    const funding = ownUtxo(0, { coins: 200_000_000n });
    const collateral = ownUtxo(1, { coins: 5_000_000n });
    const inspection = inspect({
      accountUtxos: [funding, collateral],
      serializedTx: buildSwapTx({
        // Paying the remainder to a foreign address returns us nothing.
        collateralReturn: {
          address: PARTNER_ADDRESS,
          value: { coins: 2_000_000n },
        },
        collaterals: [collateral[0]],
        fee: HONEST_FEE,
        inputs: [funding[0]],
        outputs: [
          {
            address: ORDER_SCRIPT_ADDRESS,
            datum: beneficiaryDatum(),
            value: { coins: SELL_LOVELACE + DEPOSIT },
          },
          {
            address: OWN_ADDRESS,
            value: {
              coins: 200_000_000n - SELL_LOVELACE - DEPOSIT - HONEST_FEE,
            },
          },
        ],
      }),
    });

    expect(inspection.collateralLovelace).toBe('5000000');
    expect(inspection.violations).toEqual([]);
  });

  const orderPledging = (
    collateralCoin: bigint,
    collateralReturn?: Cardano.TxOut,
  ) => {
    const funding = ownUtxo(0, { coins: 200_000_000n });
    const pledged = ownUtxo(1, { coins: collateralCoin });
    return {
      accountUtxos: [funding, pledged],
      serializedTx: buildSwapTx({
        collateralReturn,
        collaterals: [pledged[0]],
        fee: HONEST_FEE,
        inputs: [funding[0]],
        outputs: [
          {
            address: ORDER_SCRIPT_ADDRESS,
            datum: beneficiaryDatum(),
            value: { coins: SELL_LOVELACE + DEPOSIT },
          },
          {
            address: OWN_ADDRESS,
            value: {
              coins: 200_000_000n - SELL_LOVELACE - DEPOSIT - HONEST_FEE,
            },
          },
        ],
      }),
    };
  };

  describe('native assets pledged as collateral', () => {
    // CIP-40: assets may ride on a collateral input, and can only leave through
    // the return output — whose address the builder chooses, unconstrained.
    const nftUtxo = ownUtxo(1, {
      assets: new Map([[OTHER_TOKEN, 1n]]),
      coins: 2_000_000n,
    });
    const pledgingTheNft = ({
      returnAddress,
      returnAssets = true,
    }: {
      returnAddress: Cardano.PaymentAddress;
      returnAssets?: boolean;
    }) => {
      const funding = ownUtxo(0, { coins: 200_000_000n });
      return {
        accountUtxos: [funding, nftUtxo],
        serializedTx: buildSwapTx({
          collateralReturn: {
            address: returnAddress,
            value: {
              assets: returnAssets ? new Map([[OTHER_TOKEN, 1n]]) : undefined,
              coins: 1_200_000n,
            },
          },
          collaterals: [nftUtxo[0]],
          fee: HONEST_FEE,
          inputs: [funding[0]],
          outputs: [
            {
              address: ORDER_SCRIPT_ADDRESS,
              datum: beneficiaryDatum(),
              value: { coins: SELL_LOVELACE + DEPOSIT },
            },
            {
              address: OWN_ADDRESS,
              value: {
                coins: 200_000_000n - SELL_LOVELACE - DEPOSIT - HONEST_FEE,
              },
            },
          ],
        }),
      };
    };

    it('blocks a token routed to a foreign address on script failure', () => {
      // 2 ADA of collateral clears the lovelace ceiling, and the token never
      // reaches `netByTokenId`, so nothing else here can see the loss.
      const inspection = inspect(
        pledgingTheNft({ returnAddress: PARTNER_ADDRESS }),
      );

      expect(inspection.verdict).toBe('blocked');
      expect(codes(inspection)).toContain('collateralAssetsAtRisk');
    });

    it('blocks a token no return pays back at all', () => {
      expect(
        codes(
          inspect(
            pledgingTheNft({
              returnAddress: OWN_ADDRESS,
              returnAssets: false,
            }),
          ),
        ),
      ).toContain('collateralAssetsAtRisk');
    });

    it('allows a token the return pays back to this account', () => {
      const inspection = inspect(
        pledgingTheNft({ returnAddress: OWN_ADDRESS }),
      );

      expect(inspection.verdict).toBe('ok');
      expect(codes(inspection)).toEqual([]);
    });
  });

  it('accepts collateral at exactly the ceiling', () => {
    const inspection = inspect(orderPledging(SWAP_COLLATERAL_CEILING_LOVELACE));

    expect(inspection.violations).toEqual([]);
    expect(inspection.collateralLovelace).toBe('15000000');
  });

  it('blocks collateral one lovelace beyond the ceiling', () => {
    const inspection = inspect(
      orderPledging(SWAP_COLLATERAL_CEILING_LOVELACE + 1n),
    );

    expect(codes(inspection)).toEqual(['collateralExceeded']);
  });

  it('reports nothing at risk when the return pays back more than we pledged', () => {
    // Foreign collateral shares the pool, so the return can exceed our share.
    const inspection = inspect(
      orderPledging(5_000_000n, {
        address: OWN_ADDRESS,
        value: { coins: 20_000_000n },
      }),
    );

    expect(inspection.collateralLovelace).toBe('0');
    expect(inspection.violations).toEqual([]);
  });

  it('reports collateral the account puts at risk', () => {
    const funding = ownUtxo(0, { coins: 200_000_000n });
    const collateral = ownUtxo(1, { coins: 5_000_000n });
    const inspection = inspect({
      accountUtxos: [funding, collateral],
      serializedTx: buildSwapTx({
        collaterals: [collateral[0]],
        fee: HONEST_FEE,
        inputs: [funding[0]],
        outputs: [
          {
            address: ORDER_SCRIPT_ADDRESS,
            datum: beneficiaryDatum(),
            value: { coins: SELL_LOVELACE + DEPOSIT },
          },
          {
            address: OWN_ADDRESS,
            value: {
              coins: 200_000_000n - SELL_LOVELACE - DEPOSIT - HONEST_FEE,
            },
          },
        ],
      }),
    });

    expect(inspection.collateralLovelace).toBe('5000000');
    expect(inspection.depositLovelace).toBe(String(DEPOSIT));
  });

  it('collects every violation rather than stopping at the first', () => {
    const funding = ownUtxo(0, {
      assets: new Map([[OTHER_TOKEN, 5n]]),
      coins: 500_000_000n,
    });
    const inspection = inspect({
      accountUtxos: [funding],
      serializedTx: buildSwapTx({
        certificates: [STAKE_REGISTRATION],
        fee: HONEST_FEE,
        inputs: [funding[0]],
        outputs: [
          {
            address: ORDER_SCRIPT_ADDRESS,
            datum: beneficiaryDatum(),
            value: {
              assets: new Map([[OTHER_TOKEN, 5n]]),
              coins: 400_000_000n,
            },
          },
          {
            address: OWN_ADDRESS,
            value: { coins: 100_000_000n - HONEST_FEE + 7n },
          },
        ],
        withdrawals: [{ quantity: 7n, stakeAddress: REWARD_ACCOUNT }],
      }),
    });

    expect(codes(inspection).sort()).toEqual([
      'adaOutflowExceeded',
      'certificatePresent',
      'unexpectedTokenOutflow',
      'withdrawalPresent',
    ]);
  });
});
