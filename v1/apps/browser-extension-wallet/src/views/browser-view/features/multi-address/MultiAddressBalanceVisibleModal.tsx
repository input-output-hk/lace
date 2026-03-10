import React, { ReactElement } from 'react';
import { WarningModal } from '@views/browser/components';
import { useLocalStorage } from '@hooks';
import { useWalletStore } from '@stores';
import { useAnalyticsContext } from '@providers';
import { PostHogAction } from '@lace/common';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

export const MultiAddressBalanceVisibleModal = (): ReactElement => {
  const location = useLocation();
  const isOnboardingRoute = location.pathname.startsWith('/new-wallet') || location.pathname.startsWith('/setup');
  const { walletState } = useWalletStore();
  const analytics = useAnalyticsContext();
  const [showMultiAddressModal, { updateLocalStorage: setShowMultiAddressModal }] = useLocalStorage(
    'showMultiAddressModal',
    walletState?.addresses?.length > 1 && !isOnboardingRoute
  );
  const { t } = useTranslation();

  const handleCloseModal = () => {
    setShowMultiAddressModal(false);
    analytics.sendEventToPostHog(PostHogAction.OnboardingMainViewMultiAddressModalGotItClick);
  };

  return (
    <WarningModal
      header={t('browserView.multiAddressWallet.modal.title')}
      content={t('browserView.multiAddressWallet.modal.content')}
      visible={showMultiAddressModal}
      confirmLabel={t('browserView.multiAddressWallet.modal.confirm')}
      onConfirm={handleCloseModal}
      destroyOnClose
    />
  );
};
