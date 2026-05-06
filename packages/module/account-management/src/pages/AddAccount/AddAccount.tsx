import { useTranslation } from '@lace-contract/i18n';
import { type SheetScreenProps } from '@lace-lib/navigation';
import {
  AddAccountSheet as AddAccountSheetTemplate,
  Modal,
} from '@lace-lib/ui-toolkit';
import React from 'react';

import { useAddAccount } from './useAddAccount';

import type { SheetRoutes } from '@lace-lib/navigation';

export const AddAccount = (props: SheetScreenProps<SheetRoutes.AddAccount>) => {
  const { t } = useTranslation();
  const {
    secondaryButton,
    primaryButton,
    isNoRecoveryPhraseModalVisible,
    closeNoRecoveryPhraseModal,
    noRecoveryPhraseFallbackBlockchain,
    selectedBlockchain,
    ...sheetProps
  } = useAddAccount(props);

  return (
    <>
      <AddAccountSheetTemplate
        {...sheetProps}
        selectedBlockchain={selectedBlockchain}
        secondaryButton={secondaryButton}
        primaryButton={primaryButton}
      />
      <Modal
        visible={isNoRecoveryPhraseModalVisible}
        onClose={closeNoRecoveryPhraseModal}
        onConfirm={closeNoRecoveryPhraseModal}
        icon="AlertSquare"
        iconSize={64}
        title={t('v2.wallet-settings.no-recovery-phrase.title')}
        description={t(
          'v2.account-management.add-account.no-recovery-phrase.description',
          {
            currentBlockchain: noRecoveryPhraseFallbackBlockchain ?? '',
            requestedBlockchain: selectedBlockchain,
          },
        )}
        confirmText={t('v2.wallet-settings.no-recovery-phrase.confirm')}
        testIdPrefix="add-account-no-recovery-phrase-modal"
      />
    </>
  );
};
