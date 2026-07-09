import type { DerivationType } from '@lace-contract/onboarding-v2';

/**
 * Maps the Lace {@link DerivationType} to the numeric constant that
 * Trezor Connect expects in both `cardanoGetPublicKey` and
 * `cardanoSignTransaction`.
 */
export const DERIVATION_TYPE_TO_TREZOR: Record<DerivationType, number> = {
  LEDGER: 0,
  ICARUS: 1,
  ICARUS_TREZOR: 2,
};

export const toTrezorDerivationType = (
  derivationType?: DerivationType,
): number | undefined =>
  derivationType !== undefined
    ? DERIVATION_TYPE_TO_TREZOR[derivationType]
    : undefined;
