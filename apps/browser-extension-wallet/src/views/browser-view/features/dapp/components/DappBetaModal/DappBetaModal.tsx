import { useAnalyticsContext, useExternalLinkOpener } from '@providers';
import { PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';
import { getValueFromLocalStorage, saveValueInLocalStorage } from '@src/utils/local-storage';
import { WarningModal } from '@src/views/browser-view/components';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export const DappBetaModal = (): React.ReactElement => {
  const analytics = useAnalyticsContext();
  const { t } = useTranslation();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const openExternalLink = useExternalLinkOpener();

  useEffect(() => {
    const showDappBetaModal = getValueFromLocalStorage('showDappBetaModal', true);
    setIsModalVisible(showDappBetaModal);
  }, []);

  const onClose = () => {
    saveValueInLocalStorage({ key: 'showDappBetaModal', value: false });
    setIsModalVisible(false);
  };

  const onLearnMore = () => {
    const showDappBetaModal = getValueFromLocalStorage('showDappBetaModal', true);
    if (showDappBetaModal) openExternalLink(process.env.FAQ_URL);
    analytics.sendEventToPostHog(PostHogAction.DappConnectorAuthorizeDappDappConnectorBetaClick);
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
