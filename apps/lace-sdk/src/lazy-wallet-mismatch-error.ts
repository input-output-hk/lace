/**
 * The recovery words a lazy vault supplied derive another account key than
 * the one the signing account stores, so nothing was signed.
 */
export class LazyWalletMismatchError extends Error {
  public constructor() {
    super('Mnemonic does not match the selected lazy wallet account.');
    this.name = 'LazyWalletMismatchError';
  }
}
