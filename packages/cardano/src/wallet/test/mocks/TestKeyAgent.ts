import { Cardano, CML } from '@cardano-sdk/core';
import * as KeyManagement from '../../../../../../node_modules/@cardano-sdk/key-management/dist/cjs';
import * as Crypto from '@cardano-sdk/crypto';
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
    // eslint-disable-next-line unicorn/no-null
    {
      logger: console,
      bip32Ed25519: new Crypto.CmlBip32Ed25519(CML),
      // eslint-disable-next-line unicorn/no-null
      inputResolver: { resolveInput: jest.fn().mockResolvedValue(null) }
    }
  );
