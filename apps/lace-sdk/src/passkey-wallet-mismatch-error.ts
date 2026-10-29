/**
 * The passkey, or the signer, serves another account than the one expected:
 * another credential, relying party or account key than the saved binding or
 * public key names.
 */
export class PasskeyWalletMismatchError extends Error {
  public constructor() {
    super('Passkey does not match the saved Cardano wallet.');
    this.name = 'PasskeyWalletMismatchError';
  }
}
