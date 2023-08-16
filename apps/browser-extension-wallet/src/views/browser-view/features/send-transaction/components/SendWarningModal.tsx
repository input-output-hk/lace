import React, { useCallback } from 'react';
import { WarningModal } from '../../../components/WarningModal';
import { useWarningModal, useResetStore, useResetUiStore, useSections } from '../store';
import { useTranslation } from 'react-i18next';
import styles from './SendWarningModal.module.scss';
import { useDrawer } from '@src/views/browser-view/stores';
import { useRedirection } from '@hooks';
import { walletRoutePaths } from '@routes';
import { useAnalyticsContext } from '@providers';
import {
  MatomoSendEventProps,
  MatomoEventActions,
  MatomoEventCategories,
  AnalyticsEventNames
} from '@providers/AnalyticsProvider/analyticsTracker';
import { Sections } from '../types';

const { SendTransaction: Events } = AnalyticsEventNames;

interface SendWarningModalProps {
  isPopupView?: boolean;
}

export const SendWarningModal = ({ isPopupView }: SendWarningModalProps): React.ReactElement => {
  const { t } = useTranslation();
  const [isWarningModalVisible, setWarnigModalVisibility] = useWarningModal();
  const [, setIsDrawerVisible] = useDrawer();
  const reset = useResetStore();
  const resetUi = useResetUiStore();
  const redirectToOverview = useRedirection(walletRoutePaths.assets);
  const { currentSection: section, resetSection } = useSections();

  const analytics = useAnalyticsContext();

  const sendAnalytics = useCallback(() => {
    const props: Pick<MatomoSendEventProps, 'action' | 'category'> = {
      action: MatomoEventActions.CLICK_EVENT,
      category: MatomoEventCategories.SEND_TRANSACTION
    };
    switch (section.currentSection) {
      case Sections.SUMMARY:
        analytics.sendEventToMatomo({
          ...props,
          name: isPopupView ? Events.CANCEL_TX_DETAILS_POPUP : Events.CANCEL_TX_DETAILS_BROWSER
        });
        break;
      case Sections.CONFIRMATION:
        analytics.sendEventToMatomo({
          ...props,
          name: isPopupView ? Events.CANCEL_TX_PASSWORD_POPUP : Events.CANCEL_TX_PASSWORD_BROWSER
        });
    }
  }, [section.currentSection, analytics, isPopupView]);

  const resetStates = () => {
    reset();
    resetUi();
    resetSection();
  };

  const handleConfirm = () => {
    sendAnalytics();
    resetStates();
    if (isPopupView) {
      redirectToOverview();
    } else {
      setIsDrawerVisible();
    }
  };

  const handleCancel = () => setWarnigModalVisibility(false);

  const content = (
    <div className={styles.modalContent}>
      {t('general.warnings.areYouSureYouWantToExit')}
      <br />
      {t('general.warnings.thisWillNotBeSaved')}
    </div>
  );

  return (
    <WarningModal
      header={t('general.warnings.youHaveToStartAgain')}
      content={content}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
      visible={isWarningModalVisible}
      isPopupView={isPopupView}
    />
  );
};
