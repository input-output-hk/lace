import { browser } from '@wdio/globals';
import { Logger } from '../support/logger';
import { switchToWindowWithLace } from '../utils/window';
import { getTestWallet, TestWalletName } from '../support/walletConfiguration';

export const getNumWalletsInRepository = async (): Promise<number> => {
  // Wait for walletRepository API to be functional (not just the proxy to exist)
  // In bundle mode, the service worker may not have exposed the API yet
  await browser.waitUntil(
    async () => {
      try {
        const result = await browser.execute(`
          return (async () => {
            if (typeof window.walletRepository === 'undefined' || 
                typeof window.firstValueFrom === 'undefined') {
              return { ready: false };
            }
            try {
              // Actually test that the API works, not just that the proxy exists
              const wallets = await window.firstValueFrom(window.walletRepository.wallets$);
              return { ready: true, length: wallets.length };
            } catch (e) {
              return { ready: false, error: e.message };
            }
          })()
        `);
        return result && result.ready;
      } catch {
        return false;
      }
    },
    {
      timeout: 30000,
      timeoutMsg: 'walletRepository API not functional after 30 seconds - service worker may not have initialized'
    }
  );

  return await browser.execute(`
    return (async () => {
      const wallets = await window.firstValueFrom(window.walletRepository.wallets$);
      return wallets.length;
    })()
  `);
};

export const clearWalletRepository = async (): Promise<void> => {
  Logger.log('Removing wallets');
  await switchToWindowWithLace(0);

  // Wait for walletRepository API to be functional (not just the proxy to exist)
  await browser.waitUntil(
    async () => {
      try {
        const result = await browser.execute(`
          return (async () => {
            if (typeof window.walletRepository === 'undefined' || 
                typeof window.walletManager === 'undefined' ||
                typeof window.firstValueFrom === 'undefined') {
              return { ready: false };
            }
            try {
              await window.firstValueFrom(window.walletRepository.wallets$);
              return { ready: true };
            } catch (e) {
              return { ready: false, error: e.message };
            }
          })()
        `);
        return result && result.ready;
      } catch {
        return false;
      }
    },
    {
      timeout: 30000,
      timeoutMsg: 'walletRepository API not functional after 30 seconds'
    }
  );

  await browser.execute(`
    return (async () => {
      const wallets = await window.firstValueFrom(window.walletRepository.wallets$);
      // reversing in order to delete shared wallets before dependent wallets
      for (const wallet of wallets.reverse()) {
        await window.walletRepository.removeWallet(wallet.walletId);
      }
      await window.walletManager.deactivate();
      return JSON.stringify(wallets);
    })()
  `);
};

export const getWalletsFromRepository = async (): Promise<any[]> => {
  // Wait for walletRepository API to be functional
  await browser.waitUntil(
    async () => {
      try {
        const result = await browser.execute(`
          return (async () => {
            if (typeof window.walletRepository === 'undefined' || 
                typeof window.firstValueFrom === 'undefined') {
              return { ready: false };
            }
            try {
              await window.firstValueFrom(window.walletRepository.wallets$);
              return { ready: true };
            } catch (e) {
              return { ready: false };
            }
          })()
        `);
        return result && result.ready;
      } catch {
        return false;
      }
    },
    {
      timeout: 30000,
      timeoutMsg: 'walletRepository API not functional after 30 seconds'
    }
  );

  return await browser.execute(`
      const wallets = await window.firstValueFrom(window.walletRepository.wallets$);
      return wallets;
  `);
};

const addWalletInRepository = async (wallet: string): Promise<void> => {
  // Wait for walletRepository API to be functional
  await browser.waitUntil(
    async () => {
      try {
        const result = await browser.execute(`
          return (async () => {
            if (typeof window.walletRepository === 'undefined' || 
                typeof window.firstValueFrom === 'undefined') {
              return { ready: false };
            }
            try {
              await window.firstValueFrom(window.walletRepository.wallets$);
              return { ready: true };
            } catch (e) {
              return { ready: false };
            }
          })()
        `);
        return result && result.ready;
      } catch {
        return false;
      }
    },
    {
      timeout: 30000,
      timeoutMsg: 'walletRepository API not functional after 30 seconds'
    }
  );

  await browser.execute(
    `
      return (async () => {
        let walletsObj = JSON.parse('${wallet}');
        await window.walletRepository.addWallet(walletsObj[0]);
      })()
    `
  );
};

export const addAndActivateWalletInRepository = async (wallet: string): Promise<void> => {
  // Wait for walletRepository API to be functional
  await browser.waitUntil(
    async () => {
      try {
        const result = await browser.execute(`
          return (async () => {
            if (typeof window.walletRepository === 'undefined' || 
                typeof window.walletManager === 'undefined' ||
                typeof window.firstValueFrom === 'undefined') {
              return { ready: false };
            }
            try {
              await window.firstValueFrom(window.walletRepository.wallets$);
              return { ready: true };
            } catch (e) {
              return { ready: false };
            }
          })()
        `);
        return result && result.ready;
      } catch {
        return false;
      }
    },
    {
      timeout: 30000,
      timeoutMsg: 'walletRepository API not functional after 30 seconds'
    }
  );

  await browser.execute(
    `
      return (async () => {
        let walletsObj = JSON.parse('${wallet}');
        await window.walletRepository.addWallet(walletsObj[0]);
        // wait for Lace to auto-activate the added wallet,
        // which might use a different network than we want to set here
        // this is still a race and we should rework wallet initialization
        await new Promise(resolve => setTimeout(resolve, 1000));
        await window.walletManager.activate({
          walletId: walletsObj[0].walletId,
          accountIndex: walletsObj[0].accounts[0].accountIndex,
          chainId: { networkId: 0, networkMagic: 1 }
        });
      })()
    `
  );
};

export const addAndActivateWalletsInRepository = async (wallets: TestWalletName[]): Promise<void> => {
  const walletsRepositoryArray = wallets.map((wallet) => getTestWallet(wallet).repository as string);

  for (const wallet of walletsRepositoryArray.slice(1).reverse()) {
    await addWalletInRepository(wallet);
  }
  await addAndActivateWalletInRepository(walletsRepositoryArray[0]);
};
