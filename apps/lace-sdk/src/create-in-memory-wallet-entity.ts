import { AuthSecret } from '@lace-contract/authentication-prompt';
import { createInMemoryWalletEntityFactory } from '@lace-contract/onboarding-v2';
import { ByteArray } from '@lace-lib/util';
import { dummyLogger } from 'ts-log';

import type { LaceWallet } from './create-lace-wallet';
import type { InMemoryWalletIntegration } from '@lace-contract/in-memory';
import type {
  InMemoryWallet,
  LazyInMemoryWallet,
} from '@lace-contract/wallet-repo';

type BlockchainName = InMemoryWalletIntegration['blockchainName'];

/** The options of `createInMemoryWalletEntity`. */
export type CreateInMemoryWalletEntityProps = {
  /** The wallet's BIP-39 recovery words. */
  mnemonicWords: string[];
  /**
   * Encrypts the recovery phrase the entity stores, and is needed again to
   * sign. With it the entity is an {@link InMemoryWallet}. Without it the
   * entity is a {@link LazyInMemoryWallet}, which stores no seed material: a
   * vault module such as `createLazyInMemoryVaultModule` supplies the words
   * at each signature.
   */
  password?: Uint8Array;
  /** The wallet's display name. */
  walletName: string;
  /** The wallet's position among the user's wallets; `0` by default. */
  order?: number;
};

/**
 * Creates a wallet entity from recovery words, ready for
 * `wallet.dispatch('wallets.addWallet', entity)`, with an account for each
 * blockchain module the wallet loaded: an {@link InMemoryWallet} when
 * `password` is given, a {@link LazyInMemoryWallet} when it is not.
 *
 * @param wallet - The wallet the entity is created for.
 * @param props - The recovery words, the optional password, the name and the
 *   order.
 * @returns The wallet entity.
 */
export async function createInMemoryWalletEntity(
  wallet: LaceWallet,
  props: CreateInMemoryWalletEntityProps & { password: Uint8Array },
): Promise<InMemoryWallet>;
/**
 * Creates a {@link LazyInMemoryWallet} entity from recovery words: without a
 * password it stores only public keys, and signing needs a vault module that
 * supplies the words, such as `createLazyInMemoryVaultModule`.
 */
export async function createInMemoryWalletEntity(
  wallet: LaceWallet,
  props: CreateInMemoryWalletEntityProps & { password?: undefined },
): Promise<LazyInMemoryWallet>;
/**
 * Creates a wallet entity from recovery words: an {@link InMemoryWallet} when
 * `props.password` is set, a {@link LazyInMemoryWallet} when it is not.
 */
export async function createInMemoryWalletEntity(
  wallet: LaceWallet,
  props: CreateInMemoryWalletEntityProps,
): Promise<InMemoryWallet | LazyInMemoryWallet>;
export async function createInMemoryWalletEntity(
  wallet: LaceWallet,
  props: CreateInMemoryWalletEntityProps,
): Promise<InMemoryWallet | LazyInMemoryWallet> {
  return createEntity(wallet, props);
}

/**
 * {@link createInMemoryWalletEntity} with the integration of one blockchain
 * only, for an entity whose words must not derive the accounts of the other
 * blockchains the wallet loaded.
 */
export async function createBlockchainWalletEntity(
  wallet: LaceWallet,
  blockchainName: BlockchainName,
  props: CreateInMemoryWalletEntityProps & { password: Uint8Array },
): Promise<InMemoryWallet>;
export async function createBlockchainWalletEntity(
  wallet: LaceWallet,
  blockchainName: BlockchainName,
  props: CreateInMemoryWalletEntityProps & { password?: undefined },
): Promise<LazyInMemoryWallet>;
export async function createBlockchainWalletEntity(
  wallet: LaceWallet,
  blockchainName: BlockchainName,
  props: CreateInMemoryWalletEntityProps,
): Promise<InMemoryWallet | LazyInMemoryWallet> {
  return createEntity(wallet, props, blockchainName);
}

const createEntity = async (
  wallet: LaceWallet,
  props: CreateInMemoryWalletEntityProps,
  blockchainName?: BlockchainName,
): Promise<InMemoryWallet | LazyInMemoryWallet> => {
  const { mnemonicWords, password: rawPassword, walletName, order = 0 } = props;
  const password = rawPassword ? AuthSecret(ByteArray(rawPassword)) : undefined;

  const integrations = (
    (await wallet._loadModules(
      'addons.loadInMemoryWalletIntegration',
    )) as InMemoryWalletIntegration[]
  ).filter(
    integration =>
      !blockchainName || integration.blockchainName === blockchainName,
  );

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
};
