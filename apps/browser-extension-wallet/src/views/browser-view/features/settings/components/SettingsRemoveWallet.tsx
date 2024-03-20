import React, { useState } from 'react';
import { SettingsCard } from './';
import { useTranslation } from 'react-i18next';
import { Typography } from 'antd';
import { Button } from '@lace/common';
import { WarningModal } from '@views/browser/components/WarningModal';
import styles from './SettingsLayout.module.scss';
import { useWalletManager } from '@hooks';
import { useWalletStore } from '@src/stores';
import { useBackgroundServiceAPIContext } from '@providers/BackgroundServiceAPI';
import { BrowserViewSections } from '@lib/scripts/types';
import { useAnalyticsContext } from '@providers';
import { PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';
import cn from 'classnames';
import { getWalletAccountsQtyString } from '@src/utils/get-wallet-count-string';

const { Title, Text } = Typography;

export const SettingsRemoveWallet = ({ popupView }: { popupView?: boolean }): React.ReactElement => {
  const { t } = useTranslation();

  const [isRemoveWalletAlertVisible, setIsRemoveWalletAlertVisible] = useState(false);
  const { deleteWallet, walletRepository } = useWalletManager();
  const { walletInfo, setDeletingWallet } = useWalletStore();
  const backgroundServices = useBackgroundServiceAPIContext();
  const analytics = useAnalyticsContext();

  const toggleRemoveWalletAlert = () => {
    setIsRemoveWalletAlertVisible(!isRemoveWalletAlertVisible);

    analytics.sendEventToPostHog(
      isRemoveWalletAlertVisible ? PostHogAction.SettingsHoldUpBackClick : PostHogAction.SettingsRemoveWalletClick
    );
  };

  const removeWallet = async () => {
    setDeletingWallet(true);
    const nextActiveWallet = await deleteWallet();
    setDeletingWallet(false);
    analytics.sendEventToPostHog(PostHogAction.SettingsHoldUpRemoveWalletClick, {
      // eslint-disable-next-line camelcase
      $set: { wallet_accounts_quantity: await getWalletAccountsQtyString(walletRepository) }
    });
    if (nextActiveWallet) return;
    if (popupView) await backgroundServices.handleOpenBrowser({ section: BrowserViewSections.HOME });
    // force reload to ensure all stores are cleaned up
    location.reload();
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
            className={cn(styles.settingsButton, styles.settingsRemoveWalletButton)}
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
