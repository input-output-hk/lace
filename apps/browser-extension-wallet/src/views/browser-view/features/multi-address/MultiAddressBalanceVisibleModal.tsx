import React, { ReactElement } from 'react';
import { WarningModal } from '@views/browser/components';
import { useTranslate } from '@lace/core';
import { useLocalStorage } from '@hooks';
import { useWalletStore } from '@stores';

export const MultiAddressBalanceVisibleModal = (): ReactElement => {
  const { walletState } = useWalletStore();
  const [showMultiAddressModal, { updateLocalStorage: setShowMultiAddressModal }] = useLocalStorage(
    'showMultiAddressModal',
    walletState.addresses.length > 1
  );
  const { t } = useTranslate();

  const handleCloseModal = () => {
    setShowMultiAddressModal(false);
    // TODO: add analytics event https://input-output.atlassian.net/browse/LW-9761
  };

  return (
    <WarningModal
      header={t('browserView.multiAddressWallet.modal.title')}
      content={t('browserView.multiAddressWallet.modal.content')}
      visible={showMultiAddressModal}
      confirmLabel={t('browserView.multiAddressWallet.modal.confirm')}
      onConfirm={handleCloseModal}
    />
  );
};
