export type {
  AndroidPreAuthResult,
  BlockchainSpecificDataMap,
  CreateWalletEntityDependencies,
  CreateWalletEntityProps,
  PasswordStrategyResult,
  ValidationResult,
  WalletCreationContext,
  WalletCreationPayload,
} from './types';

export { PASSWORD_HEX_KEY } from './constants';

export { preAuthGuard, resetGuards, walletCreationGuard } from './guards';

export { validateWalletInput } from './validation';

export { androidBiometricPreAuth } from './android-pre-auth';

export type { PasswordStrategy } from './password-strategies';
export {
  executePasswordStrategy,
  selectPasswordStrategy,
} from './password-strategies';

export {
  computeWalletId,
  createInMemoryWalletEntityFactory,
  encryptRecoveryPhrase,
} from './wallet-entity';
