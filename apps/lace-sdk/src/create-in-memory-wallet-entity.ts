import { AuthSecret } from '@lace-contract/authentication-prompt';
import { createInMemoryWalletEntityFactory } from '@lace-contract/onboarding-v2';
import { ByteArray } from '@lace-sdk/util';
import { dummyLogger } from 'ts-log';

import type { LaceWallet } from './create-lace-wallet';
import type { InMemoryWalletIntegration } from '@lace-contract/in-memory';
import type {
  InMemoryWallet,
  LazyInMemoryWallet,
} from '@lace-contract/wallet-repo';

export type CreateInMemoryWalletEntityProps = {
  mnemonicWords: string[];
  /**
   * Password for the wallet's recovery phrase encryption.
   *
   * When supplied, the SDK creates an {@link InMemoryWallet} — the mnemonic
   * is encrypted under this password and persisted in the wallet entity.
   *
   * When omitted, the SDK creates a {@link LazyInMemoryWallet} — no seed
   * material is persisted; signing relies on a lazy-in-memory vault module
   * (see `createLazyInMemoryVaultModule`) to re-supply the mnemonic on
   * demand.
   */
  password?: Uint8Array;
  walletName: string;
  order?: number;
};

export async function createInMemoryWalletEntity(
  wallet: LaceWallet,
  props: CreateInMemoryWalletEntityProps & { password: Uint8Array },
): Promise<InMemoryWallet>;
export async function createInMemoryWalletEntity(
  wallet: LaceWallet,
  props: CreateInMemoryWalletEntityProps & { password?: undefined },
): Promise<LazyInMemoryWallet>;
export async function createInMemoryWalletEntity(
  wallet: LaceWallet,
  props: CreateInMemoryWalletEntityProps,
): Promise<InMemoryWallet | LazyInMemoryWallet>;
export async function createInMemoryWalletEntity(
  wallet: LaceWallet,
  props: CreateInMemoryWalletEntityProps,
): Promise<InMemoryWallet | LazyInMemoryWallet> {
  const { mnemonicWords, password: rawPassword, walletName, order = 0 } = props;
  const password = rawPassword ? AuthSecret(ByteArray(rawPassword)) : undefined;

  const integrations = (await wallet._loadModules(
    'addons.loadInMemoryWalletIntegration',
  )) as InMemoryWalletIntegration[];

  const logger = dummyLogger;
  const createWalletEntity = createInMemoryWalletEntityFactory({
    integrations,
    logger,
  });

  const blockchains = integrations.map(
    integration => integration.blockchainName,
  );
  return createWalletEntity({
    blockchains,
    order,
    password,
    recoveryPhrase: mnemonicWords,
    walletName,
  });
}
