import { Logger } from '../support/logger';
import { browser } from '@wdio/globals';

class ExtensionUtils {
  async getBrowser(): Promise<string> {
    // eslint-disable-next-line no-undef
    return String((browser.capabilities as WebdriverIO.Capabilities).browserName);
  }

  async getUserAgent(): Promise<string> {
    return await browser.execute('navigator.userAgent', []);
  }

  getNetwork(): { name: string; id: number } {
    let network = 'Preprod';
    let id = 1;
    switch (process.env.ENV) {
      case 'preview': {
        network = 'Preview';
        id = 2;
        break;
      }
      case 'preprod': {
        network = 'Preprod';
        id = 1;
        break;
      }
      case 'mainnet': {
        network = 'Mainnet';
        id = 764_824_073;
        break;
      }
      default: {
        Logger.log('available networks: (preview|preprod|mainnet), falling back to: preprod');
        break;
      }
    }
    return { name: network, id };
  }

  isMainnet(): boolean {
    return this.getNetwork().name === 'Mainnet';
  }
}

export default new ExtensionUtils();
