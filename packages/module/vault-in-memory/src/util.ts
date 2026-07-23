import { WalletId, WalletType } from '@lace-contract/wallet-repo';
import { encryptRecoveryPhrase } from '@lace-lib/core';

import type { CreateInMemoryWalletProps } from './types';
import type { InMemoryWalletIntegration } from '@lace-contract/in-memory';
import type {
  InMemoryWallet,
  InMemoryWalletAccount,
} from '@lace-contract/wallet-repo';
import type { BlockchainName } from '@lace-lib/util-store';
import type { Logger } from 'ts-log';

type BlockchainSpecificDataMap = { [b in BlockchainName]?: unknown };

export type CreateWalletResult = {
  wallet: InMemoryWallet;
  activate: () => Promise<void>;
};

export const createInMemoryWalletEntityFactory =
  (
    integrations: InMemoryWalletIntegration[],
    dependencies: {
      logger: Logger;
    },
  ) =>
  async ({
    password,
    recoveryPhrase,
    blockchains,
    walletName,
    order,
  }: CreateInMemoryWalletProps): Promise<CreateWalletResult> => {
    const encryptedRecoveryPhrase = await encryptRecoveryPhrase(
      recoveryPhrase,
      password,
    );
    const walletId = WalletId.deriveFromMnemonic(recoveryPhrase);
    const integrationsData = await Promise.all(
      integrations
        .filter(({ blockchainName }) => blockchains.includes(blockchainName))
        .map(async ({ initializeWallet, blockchainName }) =>
          initializeWallet(
            {
              recoveryPhrase,
              walletId,
              order,
              walletName,
              password,
            },
            dependencies,
          ).then(data => ({ ...data, blockchainName })),
        ),
    );
    const wallet: InMemoryWallet = {
      walletId,
      encryptedRecoveryPhrase,
      metadata: { name: walletName, order },
      type: WalletType.InMemory,
      // The factory always supplies a password, so integrations only ever
      // produce InMemory accounts in this code path.
      accounts: integrationsData.flatMap(
        ({ accounts }) => accounts,
      ) as InMemoryWalletAccount[],
      blockchainSpecific: integrationsData
        .map(({ blockchainName, blockchainSpecificWalletData }) => ({
          [blockchainName]: blockchainSpecificWalletData,
        }))
        .reduce(
          (result, value) => ({ ...result, ...value }),
          {} as BlockchainSpecificDataMap,
        ),
      isPassphraseConfirmed: false,
    };

    return {
      wallet,
      activate: async () => {
        password.fill(0);
      },
    };
  };

export type CreateWallet = ReturnType<typeof createInMemoryWalletEntityFactory>;
