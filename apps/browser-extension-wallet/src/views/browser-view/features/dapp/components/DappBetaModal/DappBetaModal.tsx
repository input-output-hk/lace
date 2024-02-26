import { useExternalLinkOpener } from '@providers';
import { WarningModal } from '@src/views/browser-view/components';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocalStorage } from '@hooks';

export const DappBetaModal = (): React.ReactElement => {
  const { t } = useTranslation();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [showDappBetaModal, { updateLocalStorage: setShowDappBetaModal }] = useLocalStorage('showDappBetaModal', true);
  const openExternalLink = useExternalLinkOpener();

  useEffect(() => {
    setIsModalVisible(showDappBetaModal);
  }, [showDappBetaModal]);

  const onClose = () => {
    setShowDappBetaModal(false);
    setIsModalVisible(false);
  };

  const onLearnMore = () => {
    if (showDappBetaModal) openExternalLink(process.env.FAQ_URL);
    onClose();
  };

  return (
    <WarningModal
      header={t('dapp.betaModal.header')}
      content={
        <p>
          {t('dapp.betaModal.content.1')}
          <br />
          {t('dapp.betaModal.content.2')}
        </p>
      }
      confirmLabel={t('dapp.betaModal.btn.learnMore')}
      cancelLabel={t('dapp.betaModal.btn.close')}
      onConfirm={onLearnMore}
      onCancel={onClose}
      visible={isModalVisible}
    />
  );
};
