import {
  createCardanoWallet,
  restoreWalletFromKeyAgent,
  validateWalletMnemonic,
  validateWalletPassword
} from '@wallet/lib/cardano-wallet';
import { testKeyAgent } from '@wallet/test/mocks/TestKeyAgent';
import * as KeyManagement from '../../../../../../node_modules/@cardano-sdk/key-management/dist/cjs';
import { firstValueFrom } from 'rxjs';
import omit from 'lodash/omit';
import { mockObservableWallet } from '@src/wallet/test/mocks';
import { WalletManagerUi } from '@cardano-sdk/web-extension';
import { Cardano } from '@cardano-sdk/core';

jest.mock('@cardano-sdk/web-extension', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...jest.requireActual<any>('@cardano-sdk/web-extension'),
  consumeObservableWallet: () => mockObservableWallet,
  exposeKeyAgent: () => ({ shutdown: jest.fn() }),
  WalletManagerUi: jest.fn().mockImplementation(() => ({ wallet: mockObservableWallet, activate: jest.fn() }))
}));

describe('Testing cardano-wallet', () => {
  let keyAgent: KeyManagement.InMemoryKeyAgent;
  const walletName = 'some-wallet';
  const walletManagerUi = { wallet: mockObservableWallet, activate: jest.fn() } as unknown as WalletManagerUi;
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

  describe('createCardanoWallet', () => {
    test('create an observable wallet and its corresponding key agent serializable data', async () => {
      const {
        wallet,
        keyAgent: exposedKeyAgent,
        name,
        keyAgentsByChain
      } = await createCardanoWallet(
        walletManagerUi,
        walletName,
        mnemonicWords,
        async () => Buffer.from(password),
        Cardano.ChainIds.Preprod
      );

      const [{ address }] = await firstValueFrom(wallet.addresses$);
      expect(address).toEqual(
        'addr_test1qpfhhfy2qgls50r9u4yh0l7z67xpg0a5rrhkmvzcuqrd0znuzcjqw982pcftgx53fu5527z2cj2tkx2h8ux2vxsg475q9gw0lz'
      );
      expect(name).toEqual(walletName);
      expect(wallet).toEqual(mockObservableWallet);
      expect(exposedKeyAgent.serializableData).toBeDefined();
      expect(keyAgentsByChain.Preprod).toBeDefined();
      expect(keyAgentsByChain.Preview).toBeDefined();
      expect(keyAgentsByChain.Mainnet).toBeDefined();
    });
  });

  describe('restoreWalletFromKeyAgent', () => {
    test('should restore a wallet from key agent serialized data', async () => {
      const {
        wallet,
        keyAgent: exposedKeyAgent,
        name,
        asyncKeyAgent
      } = await restoreWalletFromKeyAgent(
        walletManagerUi,
        walletName,
        keyAgent.serializableData,
        async () => Buffer.from(password),
        'Preprod'
      );

      const [{ address }] = await firstValueFrom(wallet.addresses$);
      expect(address).toEqual(
        'addr_test1qpfhhfy2qgls50r9u4yh0l7z67xpg0a5rrhkmvzcuqrd0znuzcjqw982pcftgx53fu5527z2cj2tkx2h8ux2vxsg475q9gw0lz'
      );
      expect(name).toEqual(walletName);
      expect(wallet).toEqual(mockObservableWallet);
      expect(omit(exposedKeyAgent.serializableData, 'encryptedRootPrivateKeyBytes')).toEqual(
        omit(keyAgent.serializableData, 'encryptedRootPrivateKeyBytes')
      );
      expect(asyncKeyAgent).toBeDefined();
    });
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
    test('should return true if the mnemonic for the key agent is correct', async () => {
      const valid = await validateWalletMnemonic(keyAgent.serializableData, mnemonicWords, password);
      expect(valid).toEqual(true);
    });
    test('should return false if the mnemonic for the key agent is wrong', async () => {
      const valid = await validateWalletMnemonic(
        keyAgent.serializableData,
        KeyManagement.util.generateMnemonicWords(),
        password
      );
      expect(valid).toEqual(false);
    });
    test('should throw an error if the password for the key agent is wrong', async () => {
      await expect(validateWalletMnemonic(keyAgent.serializableData, mnemonicWords, 'wrong_pass')).rejects.toThrow();
    });
  });
});
