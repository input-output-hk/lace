import { Cardano } from '@cardano-sdk/core';
import * as KeyManagement from '@cardano-sdk/key-management';
import * as Crypto from '@cardano-sdk/crypto';
// Using nodejs to satisfy the tests requirements, but this gets replaced by webpack to the browser version in the build
import * as CML from '@dcspark/cardano-multiplatform-lib-nodejs';

interface TestKeyAgentProps {
  password?: string;
  mnemonicWords?: string[];
  chainId?: Cardano.ChainId;
}

export const testKeyAgent = ({
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
      bip32Ed25519: new Crypto.CmlBip32Ed25519(CML)
    }
  );
