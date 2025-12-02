import { Cardano } from '@cardano-sdk/core';
import * as KeyManagement from '@cardano-sdk/key-management';
import * as Crypto from '@cardano-sdk/crypto';

interface TestKeyAgentProps {
  password?: string;
  mnemonicWords?: string[];
  chainId?: Cardano.ChainId;
}

export const testKeyAgent = async ({
  password = 'password',
  mnemonicWords,
  chainId = Cardano.ChainIds.Preprod
}: TestKeyAgentProps = {}): Promise<KeyManagement.InMemoryKeyAgent> =>
  KeyManagement.InMemoryKeyAgent.fromBip39MnemonicWords(
    {
      getPassphrase: async () => Buffer.from(password),
      mnemonicWords: mnemonicWords ?? KeyManagement.util.generateMnemonicWords(),
      chainId
    },
    {
      logger: console,
      bip32Ed25519: await Crypto.SodiumBip32Ed25519.create()
    }
  );
