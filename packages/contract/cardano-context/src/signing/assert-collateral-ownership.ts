export type CollateralOwnershipErrorCase = 'foreign-collateral-return';

// Claims non-ownership, never attacker intent: the wallet cannot know whether
// the return target is hostile or the user's own not-yet-derived address.
const MESSAGE: Record<CollateralOwnershipErrorCase, string> = {
  'foreign-collateral-return':
    "if the smart contract fails, this transaction would send this wallet's funds to an address this wallet doesn't own; Lace won't sign it.",
};

/**
 * The dApp-facing refusal sentence. Untranslated by contract: it travels over
 * CIP-30 to a dApp, so it must not depend on the user's locale. The on-screen
 * copy is separate, and localized.
 */
export const collateralRefusalMessage = (
  errorCase: CollateralOwnershipErrorCase,
): string => MESSAGE[errorCase];

/**
 * Thrown when the collateral-return ownership rule refuses a transaction.
 * Distinct type + per-case token so a caller can fail closed and a UI layer
 * can select its copy without string-matching the message.
 */
export class CollateralOwnershipError extends Error {
  public readonly case: CollateralOwnershipErrorCase;

  public constructor(errorCase: CollateralOwnershipErrorCase) {
    super(collateralRefusalMessage(errorCase));
    this.name = 'CollateralOwnershipError';
    this.case = errorCase;
  }
}
