import { Storage, storage as webStorage } from 'webextension-polyfill';
import { logger as commonLogger } from '@lace/common';
import { ExtensionStorage } from '@lib/scripts/types';
import { Wallet } from '@lace/cardano';
import { contextLogger } from '@cardano-sdk/util';

const logger = contextLogger(commonLogger, 'Background:StorageListener');

type ExtensionStorageChange<T extends keyof ExtensionStorage = keyof ExtensionStorage> = {
  oldValue?: ExtensionStorage[T];
  newValue?: ExtensionStorage[T];
};

const hasStorageChangeForKey = <T extends keyof ExtensionStorage>(
  changes: Record<string, Storage.StorageChange>,
  key: T
): changes is Record<T, ExtensionStorageChange<T>> => key in changes;

const handleBackgroundStorageChange = (changes: ExtensionStorageChange<'BACKGROUND_STORAGE'>) => {
  if (changes.newValue.logLevel && changes.oldValue?.logLevel !== changes.newValue?.logLevel) {
    commonLogger.setLogLevel(changes.newValue.logLevel);
  }

  if (changes.newValue.featureFlags) {
    // this FF is not network specific, we always pick the mainnet value
    const networkMagic = Wallet.Cardano.NetworkMagics.Mainnet;
    const oldLoggerSentryIntegrationEnabled =
      changes.oldValue?.featureFlags?.[networkMagic]?.['send-console-errors-to-sentry'];
    const newLoggerSentryIntegrationEnabled =
      changes.newValue?.featureFlags?.[networkMagic]?.['send-console-errors-to-sentry'];

    if (newLoggerSentryIntegrationEnabled !== oldLoggerSentryIntegrationEnabled) {
      commonLogger.setSentryIntegrationEnabled(newLoggerSentryIntegrationEnabled || false);
    }
  }
};

const initializeStorageListener = () => {
  // set initial values from storage
  webStorage.local
    .get('BACKGROUND_STORAGE')
    .then((storage) => {
      handleBackgroundStorageChange({
        oldValue: undefined,
        newValue: storage.BACKGROUND_STORAGE
      });
    })
    .catch((error) => {
      logger.error('Failed to read the storage', error);
    });

  // listen for changes to the storage
  webStorage.onChanged.addListener((changes) => {
    if (hasStorageChangeForKey(changes, 'BACKGROUND_STORAGE')) {
      handleBackgroundStorageChange(changes.BACKGROUND_STORAGE);
    }
  });
};

initializeStorageListener();
