import { dummyLogger } from 'ts-log';

import type { LaceWallet } from './create-lace-wallet';
import type {
  AddInMemoryAccountsProps,
  InMemoryWalletIntegration,
} from '@lace-contract/in-memory';
import type { InMemoryWallet } from '@lace-contract/wallet-repo';

/** Options for restoring an additional Midnight account index. */
export type CreateMidnightAccountsProps = AddInMemoryAccountsProps;

/**
 * Derives a Midnight account index using the entity's encrypted recovery material.
 * Indexes must be integers in `[0, 2³¹)`. Omitted networks use the integration's
 * defaults. Rejects duplicate accounts, an entity with neither a Midnight
 * seed nor a recovery phrase (a passkey entity), unavailable integration and
 * decryption or derivation errors. Other blockchain accounts are preserved.
 *
 * Returns an updated entity without dispatching. For a new entity, dispatch
 * `wallets.addWallet`; for an existing one, dispatch `wallets.updateWallet`
 * with its updated `accounts` and `blockchainSpecific`.
 */
export const createMidnightAccounts = async (
  wallet: LaceWallet,
  props: CreateMidnightAccountsProps,
): Promise<InMemoryWallet> => {
  if (
    !Number.isInteger(props.accountIndex) ||
    props.accountIndex < 0 ||
    props.accountIndex >= 2 ** 31
  ) {
    throw new RangeError(
      'Midnight account index must be an integer in [0, 2³¹)',
    );
  }

  // Without a seed, the integration derives Midnight from the recovery phrase.
  if (
    !props.wallet.blockchainSpecific.Midnight?.encryptedSeed &&
    !props.wallet.encryptedRecoveryPhrase
  )
    throw new Error(
      'The entity holds no Midnight seed and no recovery phrase: derive the accounts of a passkey entity with createMidnightPasskeyWalletEntity({ accounts })',
    );

  const integrations = (await wallet._loadModules(
    'addons.loadInMemoryWalletIntegration',
  )) as InMemoryWalletIntegration[];
  const integration = integrations.find(
    candidate => candidate.blockchainName === 'Midnight',
  );
  if (!integration) throw new Error('Midnight integration is not loaded');

  const { wallet: updated } = await integration.addAccounts(props, {
    logger: dummyLogger,
  });
  const accountIds = updated.accounts.map(account => account.accountId);
  if (new Set(accountIds).size !== accountIds.length) {
    throw new Error('Midnight account already exists');
  }
  return updated;
};
