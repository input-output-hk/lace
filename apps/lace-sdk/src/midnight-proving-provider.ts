import { Err, Ok } from '@lace-lib/util';
import { createProvingProviderFromCircuits } from '@lace-module/midnight-sync/sdk';
import { firstValueFrom, from, timeout } from 'rxjs';

import { midnightWalletFor, resolveMidnightAccountId } from './midnight-wallet';
import { resolveProveTimeout } from './prove-midnight-tx';

import type {
  MidnightAccountProps,
  WalletWithMidnight,
} from './midnight-wallet';
import type { Result } from '@lace-lib/util';
import type {
  KeyMaterialProvider,
  ProvingProvider,
} from '@midnight-ntwrk/dapp-connector-api';

/** Options for an account-bound circuit provider. */
export type GetMidnightProvingProviderProps = MidnightAccountProps & {
  /**
   * Circuit proving/verifying keys and ZKIR. A failed lookup for one of the
   * ledger's built-in circuits proves with the material the proof server
   * holds; any other failed lookup rejects the call with the lookup's error.
   */
  keyMaterialProvider: KeyMaterialProvider;
  /**
   * How long each `check` or `prove` call may take, in milliseconds, including
   * the `keyMaterialProvider` lookup; 10 minutes by default.
   * At most 2^31 - 1 (about 24.8 days); any other value, including `Infinity`, is
   * refused with a `RangeError`. A timeout stops waiting; it does not cancel the
   * proving under way.
   */
  proveTimeout?: number;
};

const withinTimeout = async <T>(
  operation: Promise<T>,
  milliseconds: number,
): Promise<T> => firstValueFrom(from(operation).pipe(timeout(milliseconds)));

/**
 * Captures one account identity and resolves its current engine on every use.
 * No proof-server URL or wallet keys are exposed. Factory failures are `Err`;
 * `check`/`prove` reject on transport or attestation failure without fallback,
 * and on timeout.
 * The consumer must authorize disclosure of the circuit preimage to the configured prover.
 */
export const getMidnightProvingProvider = async (
  wallet: WalletWithMidnight,
  {
    keyMaterialProvider,
    proveTimeout: requestedProveTimeout,
    ...selection
  }: GetMidnightProvingProviderProps,
): Promise<Result<ProvingProvider, Error>> => {
  try {
    const proveTimeout = resolveProveTimeout(requestedProveTimeout);
    const accountId = await resolveMidnightAccountId(
      wallet,
      selection.accountId,
    );
    const account = { ...selection, accountId };
    await midnightWalletFor(wallet, account);
    const provider = createProvingProviderFromCircuits(
      {
        check: async payload =>
          (await midnightWalletFor(wallet, account)).proofCircuitProvider.check(
            payload,
          ),
        prove: async payload =>
          (await midnightWalletFor(wallet, account)).proofCircuitProvider.prove(
            payload,
          ),
      },
      keyMaterialProvider,
      { onKeyMaterialError: 'propagate' },
    );
    return Ok({
      check: async (serializedPreimage, keyLocation) =>
        withinTimeout(
          provider.check(serializedPreimage, keyLocation),
          proveTimeout,
        ),
      prove: async (serializedPreimage, keyLocation, overwriteBindingInput) =>
        withinTimeout(
          provider.prove(
            serializedPreimage,
            keyLocation,
            overwriteBindingInput,
          ),
          proveTimeout,
        ),
    });
  } catch (error) {
    return Err(error instanceof Error ? error : new Error(String(error)));
  }
};
