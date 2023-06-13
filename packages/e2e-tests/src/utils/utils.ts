import { Capabilities } from '@wdio/types';
import localStorageManager from './localStorageManager';
import { Logger } from '../support/logger';

class ExtensionUtils {
  async getBrowser(): Promise<string> {
    return (browser.capabilities as Capabilities.Capabilities).browserName;
  }

  async getUserAgent(): Promise<string> {
    return await browser.execute('navigator.userAgent', []);
  }

  async getWalletInitialFromLocalStorage(): Promise<string> {
    const wallet = JSON.parse(await localStorageManager.getItem('wallet'));
    const walletName = wallet.name;
    return walletName.charAt(0);
  }

  getNetwork(): { name: string; id: number } {
    let network = 'Preprod';
    let id = 0;
    switch (process.env.ENV) {
      case 'preview': {
        network = 'Preview';
        id = 0;
        break;
      }
      case 'preprod': {
        network = 'Preprod';
        id = 0;
        break;
      }
      case 'mainnet': {
        network = 'Mainnet';
        id = 1;
        break;
      }
      default: {
        Logger.log('available networks: (preview|preprod|mainnet), falling back to: preprod');
        break;
      }
    }
    Logger.log(`Using network: ${network} with id: ${id}`);
    return { name: network, id };
  }

  isMainnet(): boolean {
    return this.getNetwork().name === 'Mainnet';
  }
}

export default new ExtensionUtils();
