import {
  PersistentAuthenticatorStorage,
  createPersistentAuthenticatorStorage,
  PersistentAuthenticator
} from '@cardano-sdk/dapp-connector';
import { DAPP_CHANNELS } from '@src/utils/constants';
import { Subject } from 'rxjs';
import { requestAccessDebounced } from './requestAccess';
import { storage as webStorage } from 'webextension-polyfill';
import { logger } from '@lace/common';

const createStorage = (_storage: PersistentAuthenticatorStorage) => {
  const origins$ = new Subject<string[]>();
  // emit once on load
  _storage
    .get()
    .then((origins) => origins$.next(origins))
    .catch((error) => {
      throw error;
    });
  return {
    get: _storage.get,
    set: (origins: string[]) => {
      origins$.next(origins);
      return _storage.set(origins);
    },
    origins$
  };
};

const authenticatorStorage = createPersistentAuthenticatorStorage(DAPP_CHANNELS.originsList, webStorage.local);
const internalStorage = createStorage(authenticatorStorage);
export const authenticator = new PersistentAuthenticator(
  { requestAccess: requestAccessDebounced },
  { logger, storage: internalStorage }
);
