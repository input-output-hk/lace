// The versioned labels of the passkey derivation recipe. A passkey's PRF is
// evaluated at two salts; the root is an input to derivations rather than a
// key of its own.

/** The label of the first PRF salt, whose output is the device secret. */
export const PRF_SALT_AUTHORISER_LABEL = 'lace-passport/prf/authoriser/v1';
/** The label of the second PRF salt, whose output is the root every named derivation starts from. */
export const PRF_SALT_ROOT_LABEL = 'lace/prf/root/v1';
/** The HKDF info label under which the record sealing key derives from the root. */
export const HKDF_RECORD_KEY_INFO = 'lace-passport/hkdf/record-key/v1';
/** The HKDF info label under which the wallet entropy, and from it the recovery words, derives from the root. */
export const HKDF_WALLET_ENTROPY_INFO = 'lace/hkdf/wallet-entropy/v1';
