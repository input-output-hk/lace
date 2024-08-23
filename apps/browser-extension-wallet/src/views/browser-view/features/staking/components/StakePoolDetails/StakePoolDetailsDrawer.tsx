import React, { useCallback } from 'react';
import { Drawer, DrawerNavigation, useKeyboardShortcut } from '@lace/common';
import { sectionsConfig, useStakePoolDetails } from '../../store';
import { Sections } from '../../types';
import { useWalletStore } from '@stores';
import { useSubmitingState } from '@views/browser/features/send-transaction';
import { useDelegationStore } from '@src/features/delegation/stores';
import { useTranslation } from 'react-i18next';
import { useAnalyticsContext } from '@providers';
import { PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';
import { useSecrets } from '@lace/core';

export interface StakePoolDetailsDrawerProps {
  children: React.ReactNode;
  footer?: React.ReactNode;
  popupView?: boolean;
  showCloseIcon?: boolean | ((section: Sections) => boolean);
  showBackIcon?: boolean | ((section: Sections) => boolean);
  showExitConfirmation?: (section: Sections) => boolean;
}

export const StakePoolDetailsDrawer = ({
  children,
  footer,
  popupView,
  showCloseIcon,
  showBackIcon,
  showExitConfirmation
}: StakePoolDetailsDrawerProps): React.ReactElement => {
  const {
    setExitStakingVisible,
    isDrawerVisible,
    setIsDrawerVisible,
    setSection,
    setPrevSection,
    simpleSendConfig,
    resetStates
  } = useStakePoolDetails();
  const { t } = useTranslation();
  const { setIsRestaking } = useSubmitingState();
  const { isInMemoryWallet } = useWalletStore();
  const { password, clearSecrets } = useSecrets();

  const { setDelegationTxBuilder } = useDelegationStore();
  const analytics = useAnalyticsContext();

  const closeDrawer = useCallback(() => {
    if (showExitConfirmation?.(simpleSendConfig.currentSection)) {
      setExitStakingVisible(true);
    } else {
      setDelegationTxBuilder();
      resetStates();
      clearSecrets();
      setIsDrawerVisible(false);
    }
    setIsRestaking(false);

    if (simpleSendConfig.currentSection === Sections.SUCCESS_TX) {
      analytics.sendEventToPostHog(PostHogAction.StakingManageDelegationHurrayXClick);
    }

    if (simpleSendConfig.currentSection === Sections.FAIL_TX) {
      analytics.sendEventToPostHog(PostHogAction.StakingManageDelegationSomethingWentWrongXClick);
    }
  }, [
    showExitConfirmation,
    simpleSendConfig.currentSection,
    setExitStakingVisible,
    setDelegationTxBuilder,
    resetStates,
    clearSecrets,
    setIsDrawerVisible,
    setIsRestaking,
    analytics
  ]);

  const onArrowIconClick = useCallback(() => {
    if (password) {
      clearSecrets();
    }
    if (simpleSendConfig.currentSection === Sections.CONFIRMATION && !isInMemoryWallet) {
      return setSection(sectionsConfig[Sections.DETAIL]);
    }
    if (simpleSendConfig?.prevSection) {
      return setPrevSection();
    }
    return closeDrawer();
  }, [
    closeDrawer,
    isInMemoryWallet,
    password,
    clearSecrets,
    setPrevSection,
    setSection,
    simpleSendConfig.currentSection,
    simpleSendConfig?.prevSection
  ]);

  useKeyboardShortcut(['Escape'], () => {
    if (typeof showBackIcon === 'function' ? showBackIcon(simpleSendConfig.currentSection) : showBackIcon) {
      onArrowIconClick();
    } else {
      closeDrawer();
    }
  });

  return (
    <Drawer
      visible={isDrawerVisible}
      destroyOnClose
      onClose={closeDrawer}
      navigation={
        <DrawerNavigation
          title={
            Sections.DETAIL === simpleSendConfig.currentSection
              ? t('browserView.staking.details.title')
              : t('browserView.staking.details.titleSecond')
          }
          onArrowIconClick={
            (typeof showBackIcon === 'function' ? showBackIcon(simpleSendConfig.currentSection) : showBackIcon)
              ? onArrowIconClick
              : undefined
          }
          onCloseIconClick={
            (typeof showCloseIcon === 'function' ? showCloseIcon(simpleSendConfig.currentSection) : showCloseIcon)
              ? closeDrawer
              : undefined
          }
        />
      }
      footer={footer}
      popupView={popupView}
    >
      {isDrawerVisible && children}
    </Drawer>
  );
};
