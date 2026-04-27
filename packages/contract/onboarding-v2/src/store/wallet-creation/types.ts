import type { ActionCreators } from '../../contract';
import type { CreateWalletErrorReason } from '../slice';
import type { SetupAppLock } from '@lace-contract/app-lock';
import type { AuthSecret } from '@lace-contract/authentication-prompt';
import type { InMemoryWalletIntegration } from '@lace-contract/in-memory';
import type { LacePlatform } from '@lace-contract/module';
import type { SecureStore } from '@lace-contract/secure-store';
import type { BlockchainName } from '@lace-lib/util-store';
import type { Logger } from 'ts-log';

export type CreateWalletEntityDependencies = {
  integrations: InMemoryWalletIntegration[];
  logger: Logger;
};

export type CreateWalletEntityProps = {
  walletName: string;
  blockchains: BlockchainName[];
  password: AuthSecret;
  order: number;
  recoveryPhrase: string[];
};

export type BlockchainSpecificDataMap = {
  [blockchain in BlockchainName]?: unknown;
};

export type PasswordStrategyResult =
  | { success: false; error: string; retryable?: boolean }
  | { success: true; authSecret: AuthSecret };

export type AndroidPreAuthResult =
  | {
      success: false;
      reason: 'cancelled' | 'failed' | 'lockout' | 'not_enrolled';
    }
  | { success: true };

export type WalletCreationPayload = {
  walletName: string;
  blockchains: BlockchainName[];
  password: string;
  recoveryPhrase?: string[];
};

export type WalletCreationContext = CreateWalletEntityDependencies & {
  payload: WalletCreationPayload;
  wallets: readonly { walletId: string }[];
  secureStore: SecureStore;
  actions: ActionCreators;
  platform: LacePlatform;
  setupAppLock: SetupAppLock;
};

export type ValidationResult =
  | {
      valid: false;
      reason: Extract<
        CreateWalletErrorReason,
        'invalid-input' | 'missing-integration'
      >;
    }
  | { valid: true; trimmedName: string };
