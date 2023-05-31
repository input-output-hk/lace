import localStorageManager from '../utils/localStorageManager';

class LocalStorageAssert {
  assertLocalStorageIsEmpty = async () => {
    expect(JSON.parse(await localStorageManager.getItem('wallet'))).toBeNull();
    expect(JSON.parse(await localStorageManager.getItem('appSettings'))).toBeNull();
    expect(JSON.parse(await localStorageManager.getItem('analyticsAccepted'))).toBeNull();
    expect(JSON.parse(await localStorageManager.getItem('lastStaking'))).toBeNull();
    expect(JSON.parse(await localStorageManager.getItem('lock'))).toBeNull();
  };
  assertLocalStorageIsNotEmpty = async () => {
    expect(JSON.parse(await localStorageManager.getItem('wallet'))).not.toBeNull();
    expect(JSON.parse(await localStorageManager.getItem('appSettings'))).not.toBeNull();
    expect(JSON.parse(await localStorageManager.getItem('analyticsAccepted'))).not.toBeNull();
    expect(JSON.parse(await localStorageManager.getItem('lastStaking'))).not.toBeNull();
    expect(JSON.parse(await localStorageManager.getItem('lock'))).not.toBeNull();
  };
  assertLocalStorageContainNetwork = async (expectedNetwork: string) => {
    expect(JSON.parse(await localStorageManager.getItem('appSettings')).chainName).toEqual(expectedNetwork);
  };

  assertLocalStorageKeyDoesNotExist = async (key: string) => {
    expect(JSON.parse(await localStorageManager.getItem(key))).toBeNull();
  };
}

export default new LocalStorageAssert();
