import {
  INACTIVITY_TIMEOUT_OPTIONS,
  INDEFINITE_INACTIVITY_TIMEOUT_MS,
  INDEFINITE_TIMEOUT_OPTION_VALUE,
} from '@lace-contract/app-lock';
import { useTranslation } from '@lace-contract/i18n';
import { Milliseconds } from '@lace-sdk/util';
import { useCallback, useMemo } from 'react';

import { useDispatchLaceAction, useLaceSelector } from '../hooks';

export const useLockSettings = () => {
  const { t } = useTranslation();
  const inactivityTimeout = useLaceSelector('appLock.selectInactivityTimeout');
  const setInactivityTimeout = useDispatchLaceAction(
    'appLock.setInactivityTimeout',
  );
  const defaultInactivityTimeoutMs = useLaceSelector(
    'appLock.selectDefaultInactivityTimeoutMs',
  );

  const inactivityTimeoutOptions = useMemo(
    () =>
      INACTIVITY_TIMEOUT_OPTIONS.map(opt => ({
        value: opt.value,
        label: t(opt.labelKey),
      })),
    [t],
  );

  const effectiveTimeout = inactivityTimeout ?? defaultInactivityTimeoutMs;
  const selectedLockTimeout =
    effectiveTimeout === INDEFINITE_INACTIVITY_TIMEOUT_MS
      ? INDEFINITE_TIMEOUT_OPTION_VALUE
      : effectiveTimeout.toString();

  const onLockTimeoutChange = useCallback(
    (value: string) => {
      setInactivityTimeout(
        value === INDEFINITE_TIMEOUT_OPTION_VALUE
          ? INDEFINITE_INACTIVITY_TIMEOUT_MS
          : Milliseconds(Number(value)),
      );
    },
    [setInactivityTimeout],
  );

  const title = t('v2.app-lock.inactivity-timeout.title');
  const infoLabel = t('v2.app-lock.inactivity-timeout.info');
  const description = t('v2.app-lock.inactivity-timeout.description');

  return {
    inactivityTimeoutOptions,
    title,
    infoLabel,
    description,
    selectedLockTimeout,
    onLockTimeoutChange,
  };
};
