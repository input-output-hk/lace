import type { ReactNode } from 'react';

import { useTranslation } from '@lace-contract/i18n';
import { Modal } from '@lace-lib/ui-toolkit';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { useIsInStakingTab } from '../hooks';
import { useDispatchLaceAction, useLaceSelector } from '../hooks/lace-context';

import type { AvailableAddons } from '..';
import type { ContextualLaceInit } from '@lace-contract/module';

const MultiDelegationMigrationPrompt = () => {
  const { t } = useTranslation();
  const isInStakingTab = useIsInStakingTab();
  const multiDelegationAccounts = useLaceSelector(
    'migrateMultiDelegation.selectMultiDelegationAccounts',
  );
  const migrationStatus = useLaceSelector(
    'migrateMultiDelegation.selectMigrationStatus',
  );
  const errorTranslationKeys = useLaceSelector(
    'migrateMultiDelegation.selectErrorTranslationKeys',
  );
  const multiDelegationAccount = useMemo(
    () => multiDelegationAccounts[0],
    [multiDelegationAccounts],
  );
  const onMigrate = useDispatchLaceAction('migrateMultiDelegation.migrate');
  const onReset = useDispatchLaceAction('migrateMultiDelegation.reset');

  const [isConfirmationVisible, setIsConfirmationVisible] = useState(false);

  // NOTE: this is essentially a side-effect that we have to create in UI
  // because observable side effects don't have access to navigation state
  useEffect(() => {
    if (!isInStakingTab || !multiDelegationAccount) return;
    setIsConfirmationVisible(true);
  }, [isInStakingTab, multiDelegationAccount]);

  const handleConfirm = useCallback(() => {
    setIsConfirmationVisible(false);
    if (!multiDelegationAccount) return;
    onMigrate(multiDelegationAccount);
  }, [multiDelegationAccount, onMigrate]);

  const handleDismissError = useCallback(() => onReset(), [onReset]);

  return (
    <>
      <Modal
        visible={isConfirmationVisible}
        heading={t('migrate-multi-delegation.title')}
        description={t('migrate-multi-delegation.explainer')}
        confirmText={t('migrate-multi-delegation.confirm')}
        onConfirm={handleConfirm}
        testIdPrefix="migrate-multi-delegation"
      />
      <Modal
        visible={migrationStatus === 'awaitingHwConfirmation'}
        heading={t('migrate-multi-delegation.hw.title')}
        description={t('migrate-multi-delegation.hw.connect-instruction')}
        testIdPrefix="migrate-multi-delegation-hw-signing"
        onClose={() => undefined}
      />
      <Modal
        visible={migrationStatus === 'failed' && !!errorTranslationKeys}
        heading={errorTranslationKeys ? t(errorTranslationKeys.title) : ''}
        description={
          errorTranslationKeys ? t(errorTranslationKeys.subtitle) : ''
        }
        confirmText={t('migrate-multi-delegation.hw.dismiss')}
        onConfirm={handleDismissError}
        testIdPrefix="migrate-multi-delegation-hw-error"
      />
    </>
  );
};

const loadGlobalOverlays: ContextualLaceInit<
  ReactNode,
  AvailableAddons
> = () => (
  <MultiDelegationMigrationPrompt key="multi-delegation-migration-prompt" />
);

export default loadGlobalOverlays;
