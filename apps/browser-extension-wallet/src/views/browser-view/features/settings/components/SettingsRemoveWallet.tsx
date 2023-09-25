import React, { useMemo, useState } from 'react';
import { SettingsCard } from './';
import { useTranslation } from 'react-i18next';
import { Typography } from 'antd';
import { Button } from '@lace/common';
import { Wallet } from '@lace/cardano';
import { WarningModal } from '@views/browser/components/WarningModal';
import styles from './SettingsLayout.module.scss';
import { useWalletManager } from '@hooks';
import { useWalletStore } from '@src/stores';
import { useBackgroundServiceAPIContext } from '@providers/BackgroundServiceAPI';
import { BrowserViewSections } from '@lib/scripts/types';
import { useAnalyticsContext } from '@providers';
import { PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';

const { Title, Text } = Typography;

export const SettingsRemoveWallet = ({ popupView }: { popupView?: boolean }): React.ReactElement => {
  const { t } = useTranslation();

  const [isRemoveWalletAlertVisible, setIsRemoveWalletAlertVisible] = useState(false);
  const { deleteWallet } = useWalletManager();
  const { walletInfo, getKeyAgentType } = useWalletStore();
  const isInMemory = useMemo(() => getKeyAgentType() === Wallet.KeyManagement.KeyAgentType.InMemory, [getKeyAgentType]);
  const isHardwareWalletKeyAgent = !isInMemory;
  const backgroundServices = useBackgroundServiceAPIContext();
  const analytics = useAnalyticsContext();

  const toggleRemoveWalletAlert = () => {
    setIsRemoveWalletAlertVisible(!isRemoveWalletAlertVisible);

    analytics.sendEventToPostHog(
      isRemoveWalletAlertVisible ? PostHogAction.SettingsHoldUpBackClick : PostHogAction.SettingsRemoveWalletClick
    );
  };

  const removeWallet = async () => {
    analytics.sendEventToPostHog(PostHogAction.SettingsHoldUpRemoveWalletClick);
    await deleteWallet();
    if (popupView) await backgroundServices.handleOpenBrowser({ section: BrowserViewSections.HOME });
    // TODO: Remove this workaround when on SDK side we're able to restore wallet 2 times without reloading.
    if (isHardwareWalletKeyAgent) location.reload();
  };

  return (
    <>
      <WarningModal
        header={t('browserView.settings.wallet.general.removeWalletAlert.title')}
        content={
          <span className={styles.removeWalletContent}>
            {t('browserView.settings.wallet.general.removeWalletAlert.content')}
          </span>
        }
        visible={isRemoveWalletAlertVisible}
        onCancel={toggleRemoveWalletAlert}
        onConfirm={removeWallet}
        cancelLabel={t('browserView.settings.wallet.general.removeWalletAlert.cancel')}
        confirmLabel={t('browserView.settings.wallet.general.removeAction')}
        confirmCustomClassName={styles.settingsConfirmButton}
        isPopupView={popupView}
      />
      <SettingsCard>
        <Title level={5} className={styles.heading5} data-testid={'remove-wallet-heading'}>
          {t('browserView.settings.wallet.general.removeWallet')}
        </Title>
        <div className={styles.removeDescriptionRow}>
          <Text
            style={{ width: popupView ? '100%' : '50%' }}
            className={styles.modalDescription}
            data-testid={'remove-wallet-description'}
          >
            {t('browserView.settings.wallet.general.removeWalletDescription')}
          </Text>
          <Button
            size="medium"
            className={styles.settingsButton}
            onClick={toggleRemoveWalletAlert}
            block={popupView}
            data-testid="remove-wallet-button"
          >
            {t('browserView.settings.wallet.general.removeAction', { walletName: walletInfo.name })}
          </Button>
        </div>
      </SettingsCard>
    </>
  );
};
