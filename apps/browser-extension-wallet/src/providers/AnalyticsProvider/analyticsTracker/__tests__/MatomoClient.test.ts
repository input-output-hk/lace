/* eslint-disable import/imports-first */
const mockrandombytes = jest.fn();
const mockMatomoTracker = jest.fn();
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Wallet } from '@lace/cardano';
import { MatomoClient } from '../MatomoClient';
import * as localStorage from '@src/utils/local-storage';

jest.mock('randombytes', () => {
  const original = jest.requireActual('randombytes');
  return {
    __esModule: true,
    ...original,
    default: mockrandombytes
  };
});

jest.mock('../config', () => {
  const original = jest.requireActual('../config');
  return {
    __esModule: true,
    ...original,
    ANALYTICS_API_ENDPOINT: 'ANALYTICS_API_ENDPOINT/matomo.php'
  };
});

jest.mock('matomo-tracker', () => {
  const original = jest.requireActual('matomo-tracker');
  return {
    __esModule: true,
    ...original,
    default: mockMatomoTracker
  };
});

describe('MatomoClient', () => {
  const chain = { networkId: 1 };

  test('should call get user id while called as constructor, read value from LS if available, generate new one othersise', () => {
    const mockedUserId = 'userIdRandomBytes';
    const mockedUserLS = 'userIdLS';

    const Matomo = class MatomoClientMocked {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      constructor() {}
    } as any;
    mockMatomoTracker.mockImplementation(() => new Matomo());

    mockrandombytes.mockReturnValue(mockedUserId);

    const localStorageGetSpy = jest.spyOn(localStorage, 'getValueFromLocalStorage').mockImplementationOnce(() => false);
    const localStorageSaveSpy = jest.spyOn(localStorage, 'saveValueInLocalStorage');

    const matomoClient = new MatomoClient(chain as unknown as Wallet.Cardano.ChainId);

    expect(localStorageSaveSpy).toBeCalledWith({ key: 'analyticsUserId', value: mockedUserId });
    expect(matomoClient.userId).toEqual(mockedUserId);

    expect(matomoClient.getUserId()).toEqual(mockedUserId);
    expect(localStorageSaveSpy).toBeCalledTimes(1);

    localStorageGetSpy.mockImplementation(() => mockedUserLS);
    expect(matomoClient.getUserId()).toEqual(mockedUserLS);
    expect(localStorageSaveSpy).toBeCalledTimes(1);

    localStorageSaveSpy.mockReset();
    localStorageGetSpy.mockReset();
  });
});
