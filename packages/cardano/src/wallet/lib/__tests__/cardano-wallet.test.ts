import { validateWalletMnemonic, validateWalletPassword } from '@wallet/lib/cardano-wallet';
import { testKeyAgent } from '@wallet/test/mocks/TestKeyAgent';
import * as KeyManagement from '@cardano-sdk/key-management';
import { mockObservableWallet } from '@src/wallet/test/mocks';
import { Crypto } from '@src/wallet';

jest.mock('@cardano-sdk/web-extension', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...jest.requireActual<any>('@cardano-sdk/web-extension'),
  consumeObservableWallet: () => mockObservableWallet,
  exposeKeyAgent: () => ({ shutdown: jest.fn() }),
  WalletManagerUi: jest.fn().mockImplementation(() => ({ wallet: mockObservableWallet, activate: jest.fn() }))
}));

describe('Testing cardano-wallet2234', () => {
  let keyAgent: KeyManagement.InMemoryKeyAgent;
  const mnemonicWords = [
    'board',
    'check',
    'video',
    'vote',
    'lake',
    'below',
    'comic',
    'need',
    'sample',
    'odor',
    'inhale',
    'chaos',
    'wine',
    'empower',
    'solar',
    'social',
    'manual',
    'pluck',
    'very',
    'wage',
    'usage',
    'tuna',
    'bridge',
    'spatial'
  ];
  const password = 'your_password';

  beforeAll(async () => {
    keyAgent = await testKeyAgent({ mnemonicWords, password });
  });

  describe('validateWalletPassword', () => {
    test('should return true if the password for the key agent is correct', async () => {
      const valid = await validateWalletPassword(keyAgent.serializableData, password);
      expect(valid).toEqual(true);
    });
    test('should return false if the password for the key agent is wrong', async () => {
      const valid = await validateWalletPassword(keyAgent.serializableData, 'wrong_pass');
      expect(valid).toEqual(false);
    });
  });

  describe('validateWalletMnemonic', () => {
    let publicKey: Crypto.Bip32PublicKeyHex;

    beforeEach(() => {
      publicKey = keyAgent.serializableData.extendedAccountPublicKey;
    });

    test('should return true if the mnemonic derives the same extended account public key', async () => {
      const valid = await validateWalletMnemonic(mnemonicWords, publicKey);
      expect(valid).toEqual(true);
    });
    test('should return false if the mnemonic for the key agent is wrong', async () => {
      const valid = await validateWalletMnemonic(KeyManagement.util.generateMnemonicWords(), publicKey);
      expect(valid).toEqual(false);
    });
  });
});
