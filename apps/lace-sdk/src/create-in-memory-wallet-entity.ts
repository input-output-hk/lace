import { AuthSecret } from '@lace-contract/authentication-prompt';
import { createInMemoryWalletEntityFactory } from '@lace-contract/onboarding-v2';
import { ByteArray } from '@lace-sdk/util';
import { dummyLogger } from 'ts-log';

import type { LaceWallet } from './create-lace-wallet';
import type { InMemoryWalletIntegration } from '@lace-contract/in-memory';
import type { InMemoryWallet } from '@lace-contract/wallet-repo';

export type CreateInMemoryWalletEntityProps = {
  mnemonicWords: string[];
  password: Uint8Array;
  walletName: string;
  order?: number;
};

export const createInMemoryWalletEntity = async (
  wallet: LaceWallet,
  props: CreateInMemoryWalletEntityProps,
): Promise<InMemoryWallet> => {
  const { mnemonicWords, password: rawPassword, walletName, order = 0 } = props;
  const password = AuthSecret(ByteArray(rawPassword));

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
    walletName,
    blockchains,
    password,
    order,
    recoveryPhrase: mnemonicWords,
  });
};
