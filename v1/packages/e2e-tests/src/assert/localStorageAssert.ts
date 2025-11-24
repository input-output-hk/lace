import { expect } from 'chai';
import localStorageManager from '../utils/localStorageManager';
import { browser } from '@wdio/globals';

import { getNumWalletsInRepository } from '../fixture/walletRepositoryInitializer';

class LocalStorageAssert {
  assertWalletIsDeleted = async () => {
    expect(JSON.parse(await localStorageManager.getItem('lastStaking'))).to.be.null;
    expect(JSON.parse(await localStorageManager.getItem('unconfirmedTransactions'))).to.be.null;
    expect(JSON.parse(await localStorageManager.getItem('wallet'))).to.be.null;
    expect(JSON.parse(await localStorageManager.getItem('analyticsStatus'))).to.equal('ACCEPTED'); // LW-12777
    expect(await getNumWalletsInRepository()).to.be.eq(0);
  };

  assertWalletIsNotDeleted = async () => {
    expect(JSON.parse(await localStorageManager.getItem('wallet'))).not.to.be.null;
    expect(JSON.parse(await localStorageManager.getItem('appSettings'))).not.to.be.null;
    expect(JSON.parse(await localStorageManager.getItem('analyticsStatus'))).not.to.be.null;
    expect(JSON.parse(await localStorageManager.getItem('lastStaking'))).not.to.be.null;
    expect(await getNumWalletsInRepository()).to.be.eq(1);
  };

  assertLocalStorageContainNetwork = async (expectedNetwork: string) => {
    expect(JSON.parse(await localStorageManager.getItem('appSettings')).chainName).to.equal(expectedNetwork);
  };

  assertLocalStorageKeyValue = async (key: string, value: string) => {
    expect(JSON.parse(await localStorageManager.getItem(key))).to.equal(value);
  };

  assertLocalStorageKeyDoesNotExist = async (key: string) => {
    expect(JSON.parse(await localStorageManager.getItem(key))).to.be.null;
  };

  assertLocalStorageContainsUnconfirmedTransaction = async (txType: 'internal' | 'external') => {
    await browser.waitUntil(
      async () => JSON.parse(await localStorageManager.getItem('unconfirmedTransactions')).length === 1,
      {
        interval: 100,
        timeout: 3000,
        timeoutMsg: 'Failed while waiting for unconfirmedTransactions === 1'
      }
    );
    const unconfirmedTransactions = JSON.parse(await localStorageManager.getItem('unconfirmedTransactions'));
    expect(unconfirmedTransactions[0].id).not.to.be.null;
    expect(unconfirmedTransactions[0].date).not.to.be.null;
    expect(unconfirmedTransactions[0].creationType).to.equal(txType);
  };

  assertLocalStorageUnconfirmedTransactionsIsEmpty = async () => {
    await browser.waitUntil(
      async () => JSON.parse(await localStorageManager.getItem('unconfirmedTransactions')).length === 0,
      {
        interval: 500,
        timeout: 3000,
        timeoutMsg: 'Failed while waiting for "unconfirmedTransactions" entry to be empty in local storage'
      }
    );
  };
}

export default new LocalStorageAssert();
