/* eslint-disable no-magic-numbers */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { initializeInjectedScript } from '../inject';
import { consumeRemoteAuthenticatorApi, consumeRemoteWalletApi } from '../api-consumers';
import { getWalletMode } from '../injectUtil';
import { injectGlobal } from '@cardano-sdk/dapp-connector';
import { WalletMode } from '../../types';

jest.mock('../api-consumers');
jest.mock('../injectUtil', () => ({
  ...jest.requireActual<any>('../injectUtil'),
  getWalletMode: jest.fn()
}));

jest.mock('@cardano-sdk/dapp-connector', () => ({
  ...jest.requireActual<any>('@cardano-sdk/dapp-connector'),
  injectGlobal: jest.fn()
}));

describe('initializeInjectedScript', () => {
  const logger = console;
  const walletApi = {};
  const authenticator = {};

  beforeEach(() => {
    jest.clearAllMocks();
    (consumeRemoteAuthenticatorApi as jest.Mock).mockReturnValue(authenticator);
    (consumeRemoteWalletApi as jest.Mock).mockReturnValue(walletApi);
  });

  describe('wallet mode not cached eagerly injects in lace with extensions', () => {
    it('ignores dappInjectCompatibilityMode when in lace mode', async () => {
      const latestWalletMode = Promise.resolve({ mode: 'lace', dappInjectCompatibilityMode: true });
      (getWalletMode as jest.Mock).mockReturnValue({ latestWalletMode });

      await initializeInjectedScript({ logger });

      expect(injectGlobal).toHaveBeenCalledTimes(1);
      expect(injectGlobal).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ supportedExtensions: [{ cip: 95 }, { cip: 142 }] }),
        expect.anything()
      );
    });

    it('waits for dappInjectCompatibilityMode; does not inject in nami', async () => {
      const latestWalletMode = Promise.resolve({ mode: 'nami', dappInjectCompatibilityMode: false });
      (getWalletMode as jest.Mock).mockReturnValue({ latestWalletMode });

      await initializeInjectedScript({ logger });

      expect(injectGlobal).toHaveBeenCalledTimes(1);
      expect(injectGlobal).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ supportedExtensions: [{ cip: 95 }, { cip: 142 }] }),
        expect.anything()
      );
    });

    it('waits for dappInjectCompatibilityMode and lazy injects in nami too', async () => {
      const latestWalletMode = Promise.resolve({ mode: 'nami', dappInjectCompatibilityMode: true });
      (getWalletMode as jest.Mock).mockReturnValue({ latestWalletMode });

      await initializeInjectedScript({ logger });

      expect(injectGlobal).toHaveBeenCalledTimes(2);
      expect(injectGlobal).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ supportedExtensions: [{ cip: 95 }, { cip: 142 }] }),
        expect.anything()
      );

      expect(injectGlobal).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ supportedExtensions: [{ cip: 142 }] }),
        expect.anything(),
        'nami'
      );
    });
  });

  describe('wallet mode cached', () => {
    describe('lace mode injects lace with extensions', () => {
      it('eagerly injects in lace and ignores dappInjectCompatibilityMode', async () => {
        const cachedWalletMode: WalletMode = { mode: 'lace', dappInjectCompatibilityMode: true };
        const latestWalletMode = Promise.resolve({ mode: 'nami', dappInjectCompatibilityMode: false });
        (getWalletMode as jest.Mock).mockReturnValue({ cachedWalletMode, latestWalletMode });

        await initializeInjectedScript({ logger });

        expect(injectGlobal).toHaveBeenCalledTimes(1);
        expect(injectGlobal).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({ supportedExtensions: [{ cip: 95 }, { cip: 142 }] }),
          expect.anything()
        );
      });
    });

    describe('nami mode injects lace with extensions', () => {
      it('eagerly injects in nami and does not await latest because dappInjectCompatibilityMode is enabled', async () => {
        const cachedWalletMode: WalletMode = { mode: 'nami', dappInjectCompatibilityMode: true };
        const latestWalletMode = Promise.resolve({ mode: 'nami', dappInjectCompatibilityMode: false });
        (getWalletMode as jest.Mock).mockReturnValue({ cachedWalletMode, latestWalletMode });

        await initializeInjectedScript({ logger });

        expect(injectGlobal).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({ supportedExtensions: [{ cip: 95 }, { cip: 142 }] }),
          expect.anything()
        );
        expect(injectGlobal).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({ supportedExtensions: [{ cip: 142 }] }),
          expect.anything(),
          'nami'
        );
      });

      it('awaits latest value and lazily injects in nami when dappInjectCompatibilityMode is initially disabled', async () => {
        const cachedWalletMode: WalletMode = { mode: 'nami', dappInjectCompatibilityMode: false };
        const latestWalletMode = Promise.resolve({ mode: 'nami', dappInjectCompatibilityMode: true });
        (getWalletMode as jest.Mock).mockReturnValue({ cachedWalletMode, latestWalletMode });

        await initializeInjectedScript({ logger });

        expect(injectGlobal).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({ supportedExtensions: [{ cip: 95 }, { cip: 142 }] }),
          expect.anything()
        );
        expect(injectGlobal).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({ supportedExtensions: [{ cip: 142 }] }),
          expect.anything(),
          'nami'
        );
      });
    });
  });
});
