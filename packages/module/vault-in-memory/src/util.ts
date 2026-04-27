import * as Crypto from '@cardano-sdk/crypto';
import { emip3encrypt, util } from '@cardano-sdk/key-management';
import { WalletId, WalletType } from '@lace-contract/wallet-repo';
import { ByteArray, HexBytes } from '@lace-sdk/util';

import type { CreateInMemoryWalletProps } from './types';
import type { HexBlob } from '@cardano-sdk/util';
import type { InMemoryWalletIntegration } from '@lace-contract/in-memory';
import type { InMemoryWallet } from '@lace-contract/wallet-repo';
import type { BlockchainName } from '@lace-lib/util-store';
import type { Logger } from 'ts-log';

const computeWalletId = (recoveryPhrase: string[]): WalletId => {
  const phrase = util.joinMnemonicWords(recoveryPhrase);
  const phraseHex = Buffer.from(phrase, 'utf8').toString('hex') as HexBlob;

  const BYTES_MIN = 16; // This was Crypto.blake2b.BYTES_MIN before the refactor in cardano-js-sdk
  const digest = Crypto.blake2b.hash<Crypto.Hash32ByteBase16>(
    phraseHex,
    BYTES_MIN,
  );

  const walletIdHex = Crypto.blake2b.hash<Crypto.Hash32ByteBase16>(
    digest as HexBlob,
    BYTES_MIN,
  );

  return WalletId(walletIdHex);
};

const encryptRecoveryPhrase = async (
  recoveryPhrase: string[],
  password: Uint8Array,
) => {
  const walletEncrypted = await emip3encrypt(
    ByteArray.fromUTF8(util.joinMnemonicWords(recoveryPhrase)),
    password,
  );
  return HexBytes.fromByteArray(ByteArray(walletEncrypted));
};

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
    const walletId = computeWalletId(recoveryPhrase);
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
      accounts: integrationsData.flatMap(({ accounts }) => accounts),
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
