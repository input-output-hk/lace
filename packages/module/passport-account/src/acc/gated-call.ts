import { UseCounter } from '@lace-contract/passport';
import { HexBytes } from '@lace-lib/util';

import { assertSubmitted, submitWithDustRetry } from '../infra/submit';

import { Contract } from './acc-module';
import { accountWitnesses, initialAccountPrivateState } from './deploy';
import { authArgs } from './signer';
import { resolveUseCounter } from './use-counter';

import type { AccountPrivateState, AccProviders } from './deploy';
import type { AccProvingCircuitName } from './manifest';
import type { DeviceLedgerState } from './use-counter';
import type { AccAddress, PassportAuthoriser } from '@lace-contract/passport';

const PRIVATE_STATE_ID_LENGTH = 8;

/** The found-contract handle surface gated calls are submitted through. */
export type GatedContractHandle = {
  callTx: Record<string, (...args: unknown[]) => Promise<unknown>>;
};

type FindDeployedAccountContract = (
  providers: AccProviders,
  options: {
    contractAddress: string;
    compiledContract: unknown;
    privateStateId: string;
    initialPrivateState: AccountPrivateState;
  },
) => Promise<GatedContractHandle>;

/**
 * Connects to a deployed Account Custody Contract and returns the handle
 * gated calls run through. The private state starts without the account
 * encryption secret: the device-management and grant lifecycle circuits
 * consume no witnesses, so no coin or encryption key material is needed.
 * Shielded flows will seed the viewing secret when they arrive.
 */
export const connectAccountHandle = async (
  providers: AccProviders,
  contractAddress: string,
): Promise<GatedContractHandle> => {
  const [contracts, CompiledContract] = await Promise.all([
    import('@midnight-ntwrk/midnight-js-contracts'),
    import('@midnight-ntwrk/compact-js/effect/CompiledContract'),
  ]);
  const compiledContract = CompiledContract.make('account', Contract).pipe(
    CompiledContract.withWitnesses(accountWitnesses),
  );
  const findContract =
    contracts.findDeployedContract as unknown as FindDeployedAccountContract;
  return findContract(providers, {
    contractAddress,
    compiledContract,
    privateStateId: `account-${HexBytes.fromByteArray(
      crypto.getRandomValues(new Uint8Array(PRIVATE_STATE_ID_LENGTH)),
    )}`,
    initialPrivateState: initialAccountPrivateState(),
  });
};

/**
 * The slice of the decoded Account Custody Contract ledger state a gated
 * call reads: the device fields the use-counter rescan probes plus the
 * auth nonce the challenge binds.
 */
export type GatedCallLedgerState = DeviceLedgerState & {
  readonly auth_nonce: bigint;
};

export type ExecuteGatedCallProps = {
  /** Deployed-contract handle the call is submitted through. */
  handle: GatedContractHandle;
  /** Device key that authorises the call. */
  authoriser: PassportAuthoriser;
  /**
   * Fully qualified circuit name, e.g. `add_device_with_jubjub`; only a
   * circuit the manifest pins has key material to prove with.
   */
  circuit: AccProvingCircuitName;
  /**
   * The circuit's own arguments in declaration order, from the single
   * entry of a device call to the grant id, scope fields and salt of an
   * issue call; the auth args are appended after them.
   */
  args: readonly unknown[];
  /** Address of the account the call executes against. */
  address: AccAddress;
  /** Decoded ledger state, read before the call so the signature binds the auth nonce the contract will consume. */
  ledgerState: GatedCallLedgerState;
  /** Counter the device last knew about; anchors the rescan. */
  knownUseCounter?: UseCounter;
};

/**
 * Executes one authorised circuit call against a deployed Account Custody
 * Contract: resolves the device's current use counter from the ledger,
 * has the authoriser sign the call over the observed auth nonce, submits
 * the circuit with the authorising material appended as its trailing
 * arguments (pk, use counter, announcement, closing scalar, grind nonce),
 * and returns the counter the device holds after the accepted call: the
 * consumed one plus one.
 *
 * A transaction that lands with a failing status rejects instead of
 * returning: the contract applied nothing, so no counter may advance and
 * no roster change may be recorded for it.
 */
export const executeGatedCall = async ({
  handle,
  authoriser,
  circuit,
  args,
  address,
  ledgerState,
  knownUseCounter,
}: ExecuteGatedCallProps): Promise<UseCounter> => {
  const call = handle.callTx[circuit];
  if (!call) {
    throw new Error(`Account contract handle has no circuit '${circuit}'`);
  }

  const { useCounter } = await resolveUseCounter({
    ledgerState,
    authoriser,
    address,
    knownUseCounter,
  });
  const authorisation = await authoriser.authorise({
    account: address,
    circuit,
    args,
    witnessValues: [],
    authNonce: ledgerState.auth_nonce,
    useCounter,
  });

  const finalized = await submitWithDustRetry(async () =>
    call(...args, ...authArgs(authorisation)),
  );
  assertSubmitted(`Call to ${circuit}`, finalized);
  return UseCounter(useCounter + 1n);
};
