import { Storage, storage as webStorage } from 'webextension-polyfill';
import { logger as commonLogger } from '@lace/common';
import { ExtensionStorage } from '@lib/scripts/types';
import { Wallet } from '@lace/cardano';
import { contextLogger } from '@cardano-sdk/util';
import { getNotificationsClient } from './notifications-center';
import { ExperimentName } from '../types/feature-flags';

const logger = contextLogger(commonLogger, 'Background:StorageListener');

type ExtensionStorageChange<T extends keyof ExtensionStorage = keyof ExtensionStorage> = {
  oldValue?: ExtensionStorage[T];
  newValue?: ExtensionStorage[T];
};

const hasStorageChangeForKey = <T extends keyof ExtensionStorage>(
  changes: Record<string, Storage.StorageChange>,
  key: T
): changes is Record<T, ExtensionStorageChange<T>> => key in changes;

/**
 * Extracts the latestMessageTimestamp value from a feature flag payload.
 *
 * @param payload - Feature flag payload
 * @returns ISO timestamp string, or undefined if not found
 */
const extractLatestMessageTimestamp = (payload: unknown): string | undefined => {
  if (payload && typeof payload === 'object' && 'latestMessageTimestamp' in payload) {
    const timestamp = payload.latestMessageTimestamp;
    if (typeof timestamp === 'string' && timestamp.length > 0) {
      return timestamp;
    }
  }
  // eslint-disable-next-line consistent-return
  return undefined;
};

/**
 * Handles changes to the lace-messaging-center feature flag payload.
 * Updates the latestMessageTimestamp when the feature flag payload changes.
 *
 * @param oldPayload - Previous feature flag payload value
 * @param newPayload - New feature flag payload value
 */
const handleLaceMessagingCenterPayloadChange = (oldPayload: unknown, newPayload: unknown): void => {
  const oldTimestamp = extractLatestMessageTimestamp(oldPayload);
  const newTimestamp = extractLatestMessageTimestamp(newPayload);

  if (oldTimestamp !== newTimestamp && newTimestamp !== undefined) {
    const notificationsClient = getNotificationsClient();
    if (notificationsClient) {
      notificationsClient
        .updateLatestMessageTimestamp(newTimestamp)
        .then(() => {
          logger.debug(`Successfully called updateLatestMessageTimestamp(${newTimestamp}) on notifications client`);
        })
        .catch((error) => {
          logger.error('Failed to update latest message timestamp', newTimestamp, error);
        });
    } else {
      logger.debug('Notifications client not available, cannot update timestamp from PostHog');
    }
  }
};

const handleBackgroundStorageChange = (changes: ExtensionStorageChange<'BACKGROUND_STORAGE'>) => {
  if (changes.newValue?.logLevel && changes.oldValue?.logLevel !== changes.newValue.logLevel) {
    commonLogger.setLogLevel(changes.newValue.logLevel);
  }

  if (changes.newValue?.featureFlags) {
    // this FF is not network specific, we always pick the mainnet value
    const networkMagic = Wallet.Cardano.NetworkMagics.Mainnet;
    const oldLoggerSentryIntegrationEnabled =
      changes.oldValue?.featureFlags?.[networkMagic]?.['send-console-errors-to-sentry'];
    const newLoggerSentryIntegrationEnabled =
      changes.newValue.featureFlags?.[networkMagic]?.['send-console-errors-to-sentry'];

    if (newLoggerSentryIntegrationEnabled !== oldLoggerSentryIntegrationEnabled) {
      commonLogger.setSentryIntegrationEnabled(newLoggerSentryIntegrationEnabled || false);
    }
  }

  // Handle changes to lace-messaging-center feature flag payload
  if (changes.newValue?.featureFlagPayloads) {
    const oldPayload = changes.oldValue?.featureFlagPayloads?.[ExperimentName.NOTIFICATIONS_CENTER];
    const newPayload = changes.newValue.featureFlagPayloads[ExperimentName.NOTIFICATIONS_CENTER];

    handleLaceMessagingCenterPayloadChange(oldPayload, newPayload);
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
