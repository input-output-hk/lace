/* eslint-disable no-magic-numbers */
import {
  clearTemporaryTxDataFromStorage,
  getTemporaryTxDataFromStorage,
  saveTemporaryTxDataInStorage
} from '../helpers';
import { TemporaryTransactionDataKeys } from '../types';

describe('send-transaction helpers', () => {
  let localStorageSetSpy: jest.SpyInstance;
  let localStorageRemoveSpy: jest.SpyInstance;
  let localStorageGetSpy: jest.SpyInstance;

  beforeAll(() => {
    localStorageSetSpy = jest.spyOn(Storage.prototype, 'setItem');
    localStorageRemoveSpy = jest.spyOn(Storage.prototype, 'removeItem');
    localStorageGetSpy = jest.spyOn(Storage.prototype, 'getItem');
  });

  beforeEach(async () => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('saveTemporaryTxDataInStorage', () => {
    test('saves all parameters to local storage', () => {
      saveTemporaryTxDataInStorage({ tempAddress: 'address', tempOutputs: [], tempSource: 'popup' });
      expect(localStorageSetSpy).toHaveBeenCalledTimes(3);
      expect(localStorageSetSpy).toHaveBeenCalledWith(TemporaryTransactionDataKeys.TEMP_ADDRESS, 'address');
      expect(localStorageSetSpy).toHaveBeenCalledWith(TemporaryTransactionDataKeys.TEMP_OUTPUTS, '[]');
      expect(localStorageSetSpy).toHaveBeenCalledWith(TemporaryTransactionDataKeys.TEMP_SOURCE, 'popup');
    });
    test('saves to local storage only the parameters that are defined', () => {
      saveTemporaryTxDataInStorage({ tempAddress: 'address', tempSource: 'popup' });
      expect(localStorageSetSpy).toHaveBeenCalledTimes(2);
      expect(localStorageSetSpy).toHaveBeenCalledWith(TemporaryTransactionDataKeys.TEMP_ADDRESS, 'address');
      expect(localStorageSetSpy).toHaveBeenCalledWith(TemporaryTransactionDataKeys.TEMP_SOURCE, 'popup');
      assertCalledWithArg(localStorageSetSpy, TemporaryTransactionDataKeys.TEMP_OUTPUTS, 0, true);
    });
  });

  describe('getTemporaryTxDataFromStorage', () => {
    test('gets the temporary transaction data from the local storage', () => {
      localStorage.setItem(TemporaryTransactionDataKeys.TEMP_ADDRESS, 'address');
      localStorage.setItem(TemporaryTransactionDataKeys.TEMP_OUTPUTS, '[{ "id": 1 }]');
      localStorage.setItem(TemporaryTransactionDataKeys.TEMP_SOURCE, 'popup');
      const data = getTemporaryTxDataFromStorage();

      expect(localStorageGetSpy).toHaveBeenCalledTimes(3);
      expect(data.tempAddress).toEqual('address');
      expect(data.tempOutputs).toEqual([{ id: 1 }]);
      expect(data.tempSource).toEqual('popup');
    });

    describe('missing data', () => {
      test('returns null for any data that is missing', () => {
        localStorage.setItem(TemporaryTransactionDataKeys.TEMP_ADDRESS, 'address');
        localStorage.setItem(TemporaryTransactionDataKeys.TEMP_SOURCE, 'popup');
        const data = getTemporaryTxDataFromStorage();

        expect(localStorageGetSpy).toHaveBeenCalledTimes(3);
        expect(data.tempAddress).toEqual('address');
        expect(data.tempOutputs).toBeNull();
        expect(data.tempSource).toEqual('popup');
      });
      test('returns null for all if all are missing', () => {
        const data = getTemporaryTxDataFromStorage();

        expect(localStorageGetSpy).toHaveBeenCalledTimes(3);
        expect(data.tempAddress).toBeNull();
        expect(data.tempOutputs).toBeNull();
        expect(data.tempSource).toBeNull();
      });
    });
  });

  describe('clearTemporaryTxDataFromStorage', () => {
    test('clears all data if no arguments are provided', () => {
      clearTemporaryTxDataFromStorage();
      expect(localStorageRemoveSpy).toHaveBeenCalledTimes(3);
      expect(localStorageRemoveSpy).toHaveBeenCalledWith(TemporaryTransactionDataKeys.TEMP_ADDRESS);
      expect(localStorageRemoveSpy).toHaveBeenCalledWith(TemporaryTransactionDataKeys.TEMP_OUTPUTS);
      expect(localStorageRemoveSpy).toHaveBeenCalledWith(TemporaryTransactionDataKeys.TEMP_SOURCE);
    });

    test('clears only the data for the indicated keys', () => {
      clearTemporaryTxDataFromStorage([
        TemporaryTransactionDataKeys.TEMP_ADDRESS,
        TemporaryTransactionDataKeys.TEMP_OUTPUTS
      ]);
      expect(localStorageRemoveSpy).toHaveBeenCalledTimes(2);
      expect(localStorageRemoveSpy).toHaveBeenCalledWith(TemporaryTransactionDataKeys.TEMP_ADDRESS);
      expect(localStorageRemoveSpy).toHaveBeenCalledWith(TemporaryTransactionDataKeys.TEMP_OUTPUTS);
      expect(localStorageRemoveSpy).not.toHaveBeenCalledWith(TemporaryTransactionDataKeys.TEMP_SOURCE);
    });
  });
});
