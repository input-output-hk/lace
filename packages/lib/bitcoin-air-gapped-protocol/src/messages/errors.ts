/** Stable error code for a script type other than single-sig native-segwit. */
export const WRONG_SCRIPT_TYPE_CODE = 'SEED_SIGNER_WRONG_SCRIPT_TYPE';
/** Stable error code for a multisig descriptor, which is unsupported. */
export const MULTISIG_NOT_SUPPORTED_CODE = 'SEED_SIGNER_MULTISIG_NOT_SUPPORTED';

/**
 * Thrown when an exported account is not single-sig native-segwit (BIP-84). The
 * stable {@link code} and {@link name} let callers branch without matching prose.
 */
export class WrongScriptTypeError extends Error {
  public readonly code = WRONG_SCRIPT_TYPE_CODE;

  public constructor(message = WRONG_SCRIPT_TYPE_CODE) {
    super(message);
    this.name = WRONG_SCRIPT_TYPE_CODE;
  }
}

/**
 * Thrown when an exported descriptor is multisig (multi/sortedmulti). The stable
 * {@link code} and {@link name} let callers branch without matching prose.
 */
export class MultisigNotSupportedError extends Error {
  public readonly code = MULTISIG_NOT_SUPPORTED_CODE;

  public constructor(message = MULTISIG_NOT_SUPPORTED_CODE) {
    super(message);
    this.name = MULTISIG_NOT_SUPPORTED_CODE;
  }
}
