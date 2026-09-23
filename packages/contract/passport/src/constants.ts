/**
 * Domain-separation label for the PRF salt used to derive the authoriser
 * (signing) key from the account's passkey.
 */
export const PRF_SALT_AUTHORISER_LABEL = 'lace-passport/prf/authoriser/v1';

/**
 * Domain-separation label for the PRF salt used to derive the storage
 * wrapping key from the account's passkey.
 */
export const PRF_SALT_STORAGE_LABEL = 'lace-passport/prf/storage/v1';
