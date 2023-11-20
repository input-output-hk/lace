import localStorageManager from '../utils/localStorageManager';
import { browser } from '@wdio/globals';

class LocalStorageAssert {
  assertLocalStorageIsEmpty = async () => {
    expect(JSON.parse(await localStorageManager.getItem('wallet'))).toBeNull();
    expect(JSON.parse(await localStorageManager.getItem('appSettings'))).toBeNull();
    expect(JSON.parse(await localStorageManager.getItem('analyticsAccepted'))).toBeNull();
    expect(JSON.parse(await localStorageManager.getItem('lastStaking'))).toBeNull();
    expect(JSON.parse(await localStorageManager.getItem('lock'))).toBeNull();
    expect(JSON.parse(await localStorageManager.getItem('unconfirmedTransactions'))).toBeNull();
  };
  assertLocalStorageIsNotEmpty = async () => {
    expect(JSON.parse(await localStorageManager.getItem('wallet'))).not.toBeNull();
    expect(JSON.parse(await localStorageManager.getItem('appSettings'))).not.toBeNull();
    expect(JSON.parse(await localStorageManager.getItem('analyticsAccepted'))).not.toBeNull();
    expect(JSON.parse(await localStorageManager.getItem('lastStaking'))).not.toBeNull();
    expect(JSON.parse(await localStorageManager.getItem('lock'))).not.toBeNull();
    expect(JSON.parse(await localStorageManager.getItem('unconfirmedTransactions'))).not.toBeNull();
  };
  assertLocalStorageContainNetwork = async (expectedNetwork: string) => {
    expect(JSON.parse(await localStorageManager.getItem('appSettings')).chainName).toEqual(expectedNetwork);
  };

  assertLocalStorageKeyDoesNotExist = async (key: string) => {
    expect(JSON.parse(await localStorageManager.getItem(key))).toBeNull();
  };

  assertLocalStorageContainsUnconfirmedTransaction = async (txType: 'internal' | 'external') => {
    await browser.pause(1000);
    const unconfirmedTransactions = JSON.parse(await localStorageManager.getItem('unconfirmedTransactions'));
    expect(unconfirmedTransactions.length).toEqual(1);
    expect(unconfirmedTransactions[0].id).not.toBeNull();
    expect(unconfirmedTransactions[0].date).not.toBeNull();
    expect(unconfirmedTransactions[0].creationType).toEqual(txType);
  };

  assertLocalStorageUnconfirmedTransactionsIsEmpty = async () => {
    await browser.waitUntil(
      async () => JSON.parse(await localStorageManager.getItem('unconfirmedTransactions')).length === 0,
      {
        interval: 500,
        timeout: 3000,
        timeoutMsg: 'Failed while waiting for unconfirmedTransactions LS entry to be empty'
      }
    );
  };
}

export default new LocalStorageAssert();
