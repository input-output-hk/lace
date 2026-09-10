import { InputSelectionError } from '@lace-contract/cardano-context';

/**
 * True when a dry-build failure is a coin-selection insufficiency (D2 case 6),
 * structural and permanent because buildSweepTx preselects all inputs, so it
 * fails identically on every retry. Only InputSelectionError qualifies: every
 * builder-misuse or invariant throw stays a plain Error, so it remains a
 * retryable failure rather than being mis-sold as a permanent refusal.
 */
export const isUnbalanceableSweepError = (error: unknown): boolean =>
  error instanceof InputSelectionError;
