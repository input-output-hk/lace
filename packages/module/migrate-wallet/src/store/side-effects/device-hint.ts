import { AuthenticationCancelledError } from '@lace-contract/signer';
import { classifyHardwareError } from '@lace-lib/util-hw';

import type { DeviceWaitHintKey } from '../slice';

/**
 * The guidance for a failure a device raised, or undefined when there is none
 * worth showing.
 *
 * Only call this where a DEVICE is known to be the source of the error.
 * `classifyHardwareError` reads message keywords, and a node answering
 * "transaction rejected" matches its refusal test as well as a device rejection
 * does — so classifying every error that reaches a failure boundary would report
 * device problems that never happened.
 *
 * `generic` yields nothing: its copy ("Something went wrong…") says less than
 * the failure key it would sit under.
 */
export const classifyDeviceHint = (
  error: unknown,
): DeviceWaitHintKey | undefined => {
  const category = classifyHardwareError(error);
  return category === 'generic' ? undefined : `hw-error.${category}.subtitle`;
};

/**
 * A failure a hardware device raised, carrying its guidance to a catcher that
 * cannot tell where the error came from.
 */
export class DeviceSigningError extends Error {
  public readonly hintKey: DeviceWaitHintKey;
  public readonly innerError: unknown;

  public constructor(hintKey: DeviceWaitHintKey, innerError: unknown) {
    super(`Hardware device failed: ${hintKey}`);
    this.name = 'DeviceSigningError';
    this.hintKey = hintKey;
    this.innerError = innerError;
  }
}

/**
 * Tags a device failure so the failure screen can say "open the Cardano app"
 * rather than only "the sweep transaction failed" — the same per-category
 * guidance the wizard already shows while it waits for a source device.
 *
 * Passed through unchanged: a cancellation, whose `AuthenticationCancelledError`
 * identity the sweep reads to tell a dismissed prompt from a failed sweep.
 */
export const withDeviceHint = (error: unknown): unknown => {
  if (error instanceof AuthenticationCancelledError) return error;
  const hintKey = classifyDeviceHint(error);
  return hintKey ? new DeviceSigningError(hintKey, error) : error;
};

/**
 * A failure a device raised, tagged so a catcher further out can tell it from
 * the provider errors sharing its stream.
 *
 * Wraps even a failure `classifyHardwareError` cannot name, falling back to the
 * generic guidance — right only on a screen whose job is to connect a device,
 * so this belongs at the destination probe's call site, never in the shared
 * factory: its other callers end on screens with their own failure copy.
 *
 * A cancellation passes through unchanged, like `withDeviceHint`: the sweep
 * reads its `AuthenticationCancelledError` identity.
 */
export const asDeviceFailure = (error: unknown): unknown =>
  error instanceof AuthenticationCancelledError ||
  error instanceof DeviceSigningError
    ? error
    : new DeviceSigningError(
        classifyDeviceHint(error) ?? 'hw-error.generic.subtitle',
        error,
      );

/** The guidance a device attached to this failure, if a device raised it. */
export const deviceHintKey = (error: unknown): DeviceWaitHintKey | undefined =>
  error instanceof DeviceSigningError ? error.hintKey : undefined;
