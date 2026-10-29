import { CustomError } from 'ts-custom-error';

/**
 * Error for a wallet repository operation that conflicts with the wallets
 * currently stored, such as targeting a wallet that does not exist.
 */
export class WalletConflictError extends CustomError {}
