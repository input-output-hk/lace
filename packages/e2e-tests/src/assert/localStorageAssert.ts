import { expect } from 'chai';
import localStorageManager from '../utils/localStorageManager';

class LocalStorageAssert {
  assertLocalStorageIsEmpty = async () => {
    expect(JSON.parse(await localStorageManager.getItem('wallet'))).to.be.null;
    expect(JSON.parse(await localStorageManager.getItem('appSettings'))).to.be.null;
    expect(JSON.parse(await localStorageManager.getItem('analyticsAccepted'))).to.be.null;
    expect(JSON.parse(await localStorageManager.getItem('lastStaking'))).to.be.null;
    expect(JSON.parse(await localStorageManager.getItem('lock'))).to.be.null;
  };
  assertLocalStorageIsNotEmpty = async () => {
    expect(JSON.parse(await localStorageManager.getItem('wallet'))).not.to.be.null;
    expect(JSON.parse(await localStorageManager.getItem('appSettings'))).not.to.be.null;
    expect(JSON.parse(await localStorageManager.getItem('analyticsAccepted'))).not.to.be.null;
    expect(JSON.parse(await localStorageManager.getItem('lastStaking'))).not.to.be.null;
    expect(JSON.parse(await localStorageManager.getItem('lock'))).not.to.be.null;
  };
  assertLocalStorageContainNetwork = async (expectedNetwork: string) => {
    expect(JSON.parse(await localStorageManager.getItem('appSettings')).chainName).to.equal(expectedNetwork);
  };

  assertLocalStorageKeyDoesNotExist = async (key: string) => {
    expect(JSON.parse(await localStorageManager.getItem(key))).to.be.null;
  };
}

export default new LocalStorageAssert();
