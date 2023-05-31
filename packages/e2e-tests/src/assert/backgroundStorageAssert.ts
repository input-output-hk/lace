import { getBackgroundStorage } from '../utils/browserStorage';
import { expect } from 'chai';

class BackgroundStorageAssert {
  private assertKeyNotInBackgroundStorage = async (key: string) => {
    const backgroundStorage = await getBackgroundStorage();
    expect(backgroundStorage).to.not.haveOwnProperty(key);
  };

  assertMnemonicNotInBackgroundStorage = async () => {
    await this.assertKeyNotInBackgroundStorage('mnemonic');
  };

  assertKeyAgentsByChainNotInBackgroundStorage = async () => {
    await this.assertKeyNotInBackgroundStorage('keyAgentsByChain');
  };
}

export default new BackgroundStorageAssert();
