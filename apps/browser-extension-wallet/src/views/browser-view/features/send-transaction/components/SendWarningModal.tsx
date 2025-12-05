import React from 'react';
import { WarningModal } from '../../../components/WarningModal';
import { useWarningModal, useResetStore, useResetUiStore, useSections } from '../store';
import { useTranslation } from 'react-i18next';
import styles from './SendWarningModal.module.scss';
import { useDrawer } from '@src/views/browser-view/stores';
import { useRedirection } from '@hooks';
import { walletRoutePaths } from '@routes';

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
  const { resetSection } = useSections();

  const resetStates = () => {
    reset();
    resetUi();
    resetSection();
  };

  const handleConfirm = () => {
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
      dataTestId="send-warning-modal"
    />
  );
};
