import { useTranslation } from '@lace-contract/i18n';
import { Modal, SettingsCard } from '@lace-lib/ui-toolkit';
import React, { useMemo } from 'react';

import { useResetSyncState } from '../hooks/useResetSyncState';

import type { AccountId } from '@lace-contract/wallet-repo';

interface Props {
  accountId: AccountId;
}

// No Storybook coverage: the Midnight module is not in the mobile module graph,
// and importing this row breaks the Storybook type-check via the module's
// AppConfig augmentation, which lace-mobile does not satisfy.
export const ResetSyncStateRow = ({ accountId }: Props) => {
  const { t } = useTranslation();
  const { isConfirmOpen, open, close, resetAndRestart } =
    useResetSyncState(accountId);

  const quickActions = useMemo(() => ({ onCardPress: open }), [open]);

  return (
    <>
      <SettingsCard
        isCritical
        iconName="Reload"
        testID="account-settings-reset-sync-state"
        title={t('midnight.reset-sync-state.row.title')}
        description={t('midnight.reset-sync-state.row.description')}
        quickActions={quickActions}
      />
      <Modal
        visible={isConfirmOpen}
        icon="AlertSquare"
        heading={t('midnight.reset-sync-state.modal.title')}
        description={t('midnight.reset-sync-state.modal.description')}
        confirmText={t('midnight.reset-sync-state.modal.confirm')}
        cancelText={t('midnight.reset-sync-state.modal.cancel')}
        onConfirm={resetAndRestart}
        onCancel={close}
        onClose={close}
        testIdPrefix="reset-sync-state-confirm"
      />
    </>
  );
};
