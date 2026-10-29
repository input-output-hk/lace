import { defaultTxTtlLength } from '@lace-contract/midnight-context';
import {
  deserializeMidnightSealedTransaction,
  deserializeMidnightUnsealedTransaction,
  groupMidnightConnectorInputs,
  groupMidnightConnectorOutputs,
} from '@lace-lib/vendor/midnight-connector-transaction';
import {
  catchError,
  defer,
  firstValueFrom,
  of,
  switchMap,
  throwError,
  timeout,
} from 'rxjs';

import {
  balanceMidnightRecipe,
  releaseThenThrow,
} from './balance-midnight-recipe';
import { withMidnightWallet } from './midnight-wallet';
import { resolveProveTimeout } from './prove-midnight-tx';

import type { MidnightTxRecipe } from './build-midnight-transfer';
import type {
  MidnightAccountProps,
  WalletWithMidnight,
} from './midnight-wallet';
import type { MidnightFinalizedTx } from './prove-midnight-tx';
import type { MidnightWallet } from '@lace-contract/midnight-context';
import type { Result } from '@lace-lib/util';
import type {
  DesiredInput,
  DesiredOutput,
} from '@midnight-ntwrk/dapp-connector-api';

type ProveTimeoutProps = {
  /**
   * How long the proof server may take, in milliseconds; 10 minutes by default.
   * At most 2^31 - 1 (about 24.8 days); any other value, including `Infinity`, is
   * refused with a `RangeError`. A timeout stops waiting; it does not cancel the
   * proving under way.
   */
  proveTimeout?: number;
};

/** Connector balancing accepts hexadecimal ledger transactions. Obtain consent before invoking. */
export type MidnightBalanceProps = MidnightAccountProps &
  ProveTimeoutProps & {
    tx: string;
    options?: { payFees?: boolean };
  };

/** Connector outputs use raw ledger token types, not SDK token-state identifiers. */
export type MidnightMakeTransferProps = MidnightAccountProps &
  ProveTimeoutProps & {
    desiredOutputs: DesiredOutput[];
    options?: { payFees?: boolean };
  };

/** Inputs are aggregated by kind and raw ledger token type. */
export type MidnightMakeIntentProps = MidnightAccountProps &
  ProveTimeoutProps & {
    desiredInputs: DesiredInput[];
    desiredOutputs: DesiredOutput[];
    options: {
      /** Accepted but ignored, matching the connector; does not control intent ordering. */
      intentId: number | 'random';
      payFees: boolean;
    };
  };

const validateOptions = (options: MidnightBalanceProps['options']) => {
  if (
    options !== undefined &&
    (!options ||
      typeof options !== 'object' ||
      Array.isArray(options) ||
      (options.payFees !== undefined && typeof options.payFees !== 'boolean'))
  ) {
    throw new Error('Invalid Midnight fee options');
  }
};

const validateTokens = (tokens: DesiredInput[]) => {
  if (!Array.isArray(tokens)) throw new Error('Expected Midnight token array');
  for (const token of tokens) {
    if (!token || (token.kind !== 'shielded' && token.kind !== 'unshielded')) {
      throw new Error('Unsupported Midnight token kind');
    }
    if (typeof token.type !== 'string' || !/^[\da-f]{64}$/i.test(token.type)) {
      throw new Error('Expected a raw Midnight ledger token type');
    }
    if (typeof token.value !== 'bigint' || token.value < 0n) {
      throw new Error('Expected a non-negative Midnight token value');
    }
  }
};

const validateBalance = ({ tx, options }: MidnightBalanceProps) => {
  validateOptions(options);
  if (typeof tx !== 'string' || !/^(?:[\da-f]{2})+$/i.test(tx)) {
    throw new Error('Expected a hexadecimal Midnight transaction');
  }
};

// What a connector build reserved, as a recipe `revert` takes: the whole
// recipe when the wallet built it, otherwise its balancing transaction. The
// dApp's own transaction may spend coins an earlier build reserved, and the
// wallet does not reserve the unshielded inputs it adds to an unbound one.
const reservedBy = (recipe: MidnightTxRecipe): MidnightTxRecipe | undefined =>
  recipe.type === 'UNPROVEN_TRANSACTION'
    ? recipe
    : recipe.balancingTransaction && {
        type: 'UNPROVEN_TRANSACTION',
        transaction: recipe.balancingTransaction,
      };

// The timeout bounds proving only: it stops waiting for the proof server
// without cancelling the proving under way, as `proveMidnightTx` does.
// A signing failure leaves the build's reservations in place and the caller
// holds no recipe to discard, so they are released first. A proving failure
// is left to the engine, which releases what it was proving.
const finalize = async (
  wallet: MidnightWallet,
  recipe: MidnightTxRecipe,
  { sign, proveTimeout }: { sign: boolean; proveTimeout: number },
): Promise<MidnightFinalizedTx> => {
  const reserved = reservedBy(recipe);
  const prepared = sign
    ? await firstValueFrom(
        wallet
          .signRecipe(recipe)
          .pipe(
            catchError((signingError: unknown) =>
              reserved
                ? releaseThenThrow(wallet, reserved, signingError)
                : throwError(() => signingError),
            ),
          ),
      )
    : recipe;
  return firstValueFrom(
    wallet.finalizeRecipe(prepared).pipe(timeout(proveTimeout)),
  );
};

/**
 * Balances, signs and proves a binding transaction; never submits it.
 * Obtain consumer consent for the transaction, account and prover disclosure before calling.
 */
export const balanceMidnightSealedTransaction = async (
  wallet: WalletWithMidnight,
  props: MidnightBalanceProps,
): Promise<Result<MidnightFinalizedTx, Error>> =>
  withMidnightWallet(wallet, props, engine =>
    defer(async () => {
      const proveTimeout = resolveProveTimeout(props.proveTimeout);
      validateBalance(props);
      const transaction = await deserializeMidnightSealedTransaction(props.tx);
      const recipe = await firstValueFrom(
        engine.balanceFinalizedTransaction(transaction, {
          ttl: new Date(Date.now() + defaultTxTtlLength),
          tokenKindsToBalance:
            props.options?.payFees === false
              ? ['shielded', 'unshielded']
              : undefined,
        }),
      );
      return finalize(engine, recipe, {
        sign: true,
        proveTimeout,
      });
    }),
  );

/**
 * Balances, signs and proves a pre-binding transaction; never submits it.
 * Obtain consumer consent for the transaction, account and prover disclosure before calling.
 */
export const balanceMidnightUnsealedTransaction = async (
  wallet: WalletWithMidnight,
  props: MidnightBalanceProps,
): Promise<Result<MidnightFinalizedTx, Error>> =>
  withMidnightWallet(wallet, props, engine =>
    defer(async () => {
      const proveTimeout = resolveProveTimeout(props.proveTimeout);
      validateBalance(props);
      const transaction = await deserializeMidnightUnsealedTransaction(
        props.tx,
      );
      const recipe = await firstValueFrom(
        engine.balanceUnboundTransaction(transaction, {
          ttl: new Date(Date.now() + defaultTxTtlLength),
          tokenKindsToBalance:
            props.options?.payFees === false
              ? ['shielded', 'unshielded']
              : undefined,
        }),
      );
      return finalize(engine, recipe, {
        sign: true,
        proveTimeout,
      });
    }),
  );

/**
 * Builds and proves connector transfers, including mixed token kinds; signs when unshielded outputs exist.
 * Obtain consumer consent before calling. Returns a native finalized transaction without submitting.
 * Fees default to enabled; use `buildMidnightTransfers` for separate homogeneous build/sign/prove stages.
 */
export const makeMidnightTransfer = async (
  wallet: WalletWithMidnight,
  props: MidnightMakeTransferProps,
): Promise<Result<MidnightFinalizedTx, Error>> =>
  withMidnightWallet(wallet, props, engine =>
    defer(async () => {
      const proveTimeout = resolveProveTimeout(props.proveTimeout);
      validateOptions(props.options);
      validateTokens(props.desiredOutputs);
      const outputs = groupMidnightConnectorOutputs(
        props.desiredOutputs,
        engine.networkId,
      );
      const ttl = new Date(Date.now() + defaultTxTtlLength);
      // Built without its fee, then balanced when fees are paid, so that a
      // release that fails beside a fee failure is reported, not dropped.
      const recipe = await firstValueFrom(
        engine
          .transferTransaction(outputs, { ttl, payFees: false })
          .pipe(
            switchMap(built =>
              props.options?.payFees ?? true
                ? balanceMidnightRecipe(engine, built, ttl)
                : of(built),
            ),
          ),
      );
      return finalize(engine, recipe, {
        sign: outputs.some(output => output.type === 'unshielded'),
        proveTimeout,
      });
    }),
  );

// The wallet library builds each kind's leg from that kind's inputs and
// silently drops the outputs of a kind that offers none, so the signed
// transaction would no longer express the requested exchange.
const assertOutputKindsHaveInputs = (
  inputs: ReturnType<typeof groupMidnightConnectorInputs>,
  outputs: ReturnType<typeof groupMidnightConnectorOutputs>,
) => {
  const missing = outputs
    .map(output => output.type)
    .filter(kind => inputs[kind] === undefined);
  if (missing.length > 0)
    throw new Error(
      `Midnight intent requests ${missing.join(
        ' and ',
      )} outputs without inputs of that kind, which the wallet library would drop`,
    );
};

/**
 * Builds and proves an intent, signing when inputs or outputs include unshielded tokens.
 * Obtain consumer consent before calling. Never submits. `intentId` is accepted but ignored,
 * matching the existing connector; no intent ordering is guaranteed. Every output kind
 * needs an input of the same kind: the wallet library builds a leg from its inputs and
 * drops the outputs of a kind without any, so such a request is refused before anything
 * is reserved or signed. When the fee cannot be paid, the inputs the build reserved are
 * released and the balancing error is returned; if that release fails too, the error is
 * an `AggregateError` of both failures and the coins stay reserved until a sync reset.
 */
export const makeMidnightIntent = async (
  wallet: WalletWithMidnight,
  props: MidnightMakeIntentProps,
): Promise<Result<MidnightFinalizedTx, Error>> =>
  withMidnightWallet(wallet, props, engine =>
    defer(async () => {
      const proveTimeout = resolveProveTimeout(props.proveTimeout);
      validateOptions(props.options);
      if (
        !props.options ||
        typeof props.options.payFees !== 'boolean' ||
        (props.options.intentId !== 'random' &&
          typeof props.options.intentId !== 'number')
      ) {
        throw new Error('Invalid Midnight intent options');
      }
      validateTokens(props.desiredInputs);
      validateTokens(props.desiredOutputs);
      const inputs = groupMidnightConnectorInputs(props.desiredInputs);
      const outputs = groupMidnightConnectorOutputs(
        props.desiredOutputs,
        engine.networkId,
      );
      assertOutputKindsHaveInputs(inputs, outputs);
      const ttl = new Date(Date.now() + defaultTxTtlLength);
      // Built without its fee, then balanced when fees are paid, so that a
      // release that fails beside a fee failure is reported, not dropped.
      const recipe = await firstValueFrom(
        engine
          .initSwap(inputs, outputs, { ttl, payFees: false })
          .pipe(
            switchMap(built =>
              props.options.payFees
                ? balanceMidnightRecipe(engine, built, ttl)
                : of(built),
            ),
          ),
      );
      return finalize(engine, recipe, {
        sign:
          !!inputs.unshielded ||
          outputs.some(output => output.type === 'unshielded'),
        proveTimeout,
      });
    }),
  );
