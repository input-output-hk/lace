import {
  constructDustDesignationTransaction,
  constructShieldedTransaction,
  constructUnshieldedTransaction,
  estimatePreparedMidnightFee,
  normalizeMidnightTransfers,
} from '@lace-module/midnight-sync/sdk';
import { combineLatest, defer, map, switchMap, take } from 'rxjs';

import { withMidnightWallet } from './midnight-wallet';
import { prepareMidnightDustRegistration } from './register-midnight-dust';

import type { MidnightTransferBatch } from './build-midnight-transfers';
import type { WalletWithMidnight } from './midnight-wallet';
import type { RegisterMidnightDustProps } from './register-midnight-dust';
import type { Result } from '@lace-lib/util';

/** An unsigned operation to estimate before requesting consumer consent. */
export type MidnightFeeRequest =
  | { kind: 'dust-registration'; registration: RegisterMidnightDustProps }
  | { kind: 'transfer'; transfer: MidnightTransferBatch };

/**
 * Estimates DUST from unsigned preparation, without registering or signing.
 * A first registration with no spendable DUST estimates zero; a repeat
 * registration is estimated like the DUST balancing it performs.
 * Estimates depend on current state/time and are not guaranteed final charges.
 * Insufficient spendable DUST returns an error.
 */
export const estimateMidnightFee = async (
  wallet: WalletWithMidnight,
  request: MidnightFeeRequest,
): Promise<Result<{ dustFee: bigint; availableDust: bigint }, Error>> => {
  const props =
    request.kind === 'transfer' ? request.transfer : request.registration;
  return withMidnightWallet(wallet, props, engine =>
    defer(() => {
      const prepared$ =
        request.kind === 'transfer'
          ? engine.state().pipe(
              take(1),
              map(state => {
                const { kind, outputs, ttl } = request.transfer;
                const transfers = normalizeMidnightTransfers(
                  engine.networkId,
                  kind,
                  outputs,
                );
                const construct =
                  kind === 'shielded'
                    ? constructShieldedTransaction
                    : constructUnshieldedTransaction;
                return {
                  state,
                  tx: construct({
                    networkId: engine.networkId,
                    transfers,
                    ttl,
                  }),
                  isFirstDesignation: false,
                };
              }),
            )
          : prepareMidnightDustRegistration(engine, request.registration).pipe(
              map(
                ({ state, nightCoins, destination, isRepeatRegistration }) => ({
                  state,
                  // The engine's validity window: registration accepts no ttl.
                  tx: constructDustDesignationTransaction({
                    networkId: engine.networkId,
                    address: destination,
                    nightUtxos: nightCoins,
                    nightVerifyingKey: engine.nightVerifyingKey,
                    // The engine builds a registration of already registered
                    // NIGHT with no fee allowance and balances it with DUST;
                    // pricing it with the default allowance (the whole NIGHT
                    // value, which the ledger credits as DUST) would hide that
                    // fee. With some NIGHT unregistered the engine may allow a
                    // little, so zero gives an upper bound.
                    allowFeePayment: isRepeatRegistration ? 0n : undefined,
                  }),
                  // A repeat registration is balanced with DUST, so only a
                  // first one takes the designation's zero-fee exception.
                  isFirstDesignation: !isRepeatRegistration,
                }),
              ),
            );
      return combineLatest([
        prepared$,
        engine.areKeysAvailable$.pipe(take(1)),
      ]).pipe(
        switchMap(([{ state, tx, isFirstDesignation }, areKeysAvailable]) => {
          const availableDust = state.dust.balance(new Date());
          return estimatePreparedMidnightFee(engine, tx, {
            isDustDesignation: isFirstDesignation,
            dustBalance: availableDust,
            areKeysAvailable,
          }).pipe(
            map(dustFee => {
              if (dustFee > availableDust)
                throw new Error('Insufficient spendable DUST');
              return { dustFee, availableDust };
            }),
          );
        }),
      );
    }),
  );
};
