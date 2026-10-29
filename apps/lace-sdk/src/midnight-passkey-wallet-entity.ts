import { createBlockchainWalletEntity } from './create-in-memory-wallet-entity';
import { createMidnightAccounts } from './create-midnight-accounts';

import type { LaceWallet } from './create-lace-wallet';
import type { CreateMidnightAccountsProps } from './create-midnight-accounts';
import type { InMemoryWallet } from '@lace-contract/wallet-repo';
import type { PasskeyKeySource } from '@lace-lib/passkey';

/** The options of `createMidnightPasskeyWalletEntity`. */
export type CreateMidnightPasskeyWalletEntityProps = {
  keySource: PasskeyKeySource;
  /** The bytes `createMidnightModule` was given. */
  password: Uint8Array;
  walletName: string;
  /**
   * Further accounts to derive within the same assertion, beside account 0
   * on every network. The entity holds no seed, so `createMidnightAccounts`
   * cannot add accounts to it later.
   */
  accounts?: ReadonlyArray<
    Omit<CreateMidnightAccountsProps, 'password' | 'wallet'>
  >;
};

/**
 * Derives the Midnight accounts of the passkey's words inside one assertion.
 * Unlike the Cardano passkey entity, the result is an `InMemory` wallet: the
 * Midnight engine needs the account keys while it syncs, so each account
 * holds its keys sealed under `password`. The entity holds no recovery
 * phrase and no seed, and no account of another blockchain.
 */
export const createMidnightPasskeyWalletEntity = async (
  wallet: LaceWallet,
  {
    keySource,
    password,
    walletName,
    accounts = [],
  }: CreateMidnightPasskeyWalletEntityProps,
): Promise<InMemoryWallet> =>
  keySource.withPasskeyMnemonic(async words => {
    let entity = await createBlockchainWalletEntity(wallet, 'Midnight', {
      mnemonicWords: [...words],
      password,
      walletName,
    });
    if (entity.accounts.length === 0)
      throw new Error(
        'No Midnight account derived: load createMidnightModule behind FEATURE_FLAG_MIDNIGHT',
      );
    for (const account of accounts)
      entity = await createMidnightAccounts(wallet, {
        ...account,
        wallet: entity,
        password,
      });
    return withoutSeedMaterial(entity);
  });

// The words and the seed would unlock every blockchain of the passkey under
// the password alone; the passkey assertion is what must guard them.
const withoutSeedMaterial = ({
  encryptedRecoveryPhrase: _phrase,
  blockchainSpecific: { Midnight: _seed, ...blockchainSpecific },
  ...entity
}: InMemoryWallet): InMemoryWallet => ({ ...entity, blockchainSpecific });
