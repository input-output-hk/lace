import {
  CardanoCustodyLogicNotServedError,
  CardanoCustodyLogicRewardBalanceError,
  CardanoCustodyScriptDataHashError,
} from './cardano-custody-errors';
import { CardanoCustodySponsorError } from './cardano-custody-sponsor';

/** How the sponsor's `no_foreign_scripts` rule names a logic run that draws lovelace. */
const LOGIC_DRAW =
  /^The withdrawal that runs logic ([\da-f]{56}) draws (\d+) lovelace/i;

/**
 * How the sponsor's `script_data_hash` rule names a hash it computed to
 * another value. The rule also refuses when its chain provider fails to
 * answer, which can pass, so only this detail is persistent.
 */
const SCRIPT_DATA_MISMATCH =
  /^The body commits to the script data hash [\da-f]+ while the witness set carries script data hashing to [\da-f]+/i;

/**
 * The typed error for a fee sponsor refusal that no build can avoid while
 * the sponsor, the chain or the account stay as they are, or undefined for
 * any other refusal:
 *
 * - `known_logic`: the sponsor does not serve the account's logic;
 * - `script_data_hash`, when the sponsor computed the hash: it hashes the
 *   script data otherwise;
 * - a logic run that draws lovelace under `no_foreign_scripts`: the logic's
 *   reward account holds a balance the transaction had to withdraw.
 */
export const persistentSponsorRefusalOf = (
  error: unknown,
): Error | undefined => {
  if (
    !(error instanceof CardanoCustodySponsorError) ||
    error.code !== 'invalid_transaction' ||
    error.rule === undefined
  ) {
    return undefined;
  }
  const detail = error.detail ?? '';
  switch (error.rule) {
    case 'known_logic':
      return new CardanoCustodyLogicNotServedError(detail);
    case 'script_data_hash':
      return SCRIPT_DATA_MISMATCH.test(detail)
        ? new CardanoCustodyScriptDataHashError(detail)
        : undefined;
    case 'no_foreign_scripts': {
      const draw = LOGIC_DRAW.exec(detail);
      return draw
        ? new CardanoCustodyLogicRewardBalanceError(
            draw[1].toLowerCase(),
            BigInt(draw[2]),
          )
        : undefined;
    }
    default:
      return undefined;
  }
};
