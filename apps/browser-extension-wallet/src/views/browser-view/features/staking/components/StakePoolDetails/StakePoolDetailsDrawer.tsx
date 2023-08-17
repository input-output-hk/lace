import React, { useCallback, useMemo } from 'react';
import { Drawer, DrawerNavigation, useKeyboardShortcut } from '@lace/common';
import { Wallet } from '@lace/cardano';
import { sectionsConfig, useStakePoolDetails } from '../../store';
import { Sections } from '../../types';
import { useWalletStore } from '@stores';
import { usePassword, useSubmitingState } from '@views/browser/features/send-transaction';
import { useDelegationStore } from '@src/features/delegation/stores';
import { useBackgroundServiceAPIContext } from '@providers/BackgroundServiceAPI';
import { useTranslation } from 'react-i18next';
import { useAnalyticsContext } from '@providers';
import { PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';

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
  const { getKeyAgentType } = useWalletStore();
  const { password, removePassword } = usePassword();
  const isInMemory = useMemo(() => getKeyAgentType() === Wallet.KeyManagement.KeyAgentType.InMemory, [getKeyAgentType]);
  // const isSuccessSection = useMemo(
  //   () => simpleSendConfig.currentSection === Sections.SUCCESS_TX,
  //   [simpleSendConfig.currentSection]
  // );
  const { setDelegationTxBuilder } = useDelegationStore();
  const backgroundService = useBackgroundServiceAPIContext();
  const analytics = useAnalyticsContext();

  const closeDrawer = useCallback(() => {
    if (showExitConfirmation?.(simpleSendConfig.currentSection)) {
      setExitStakingVisible(true);
    } else {
      backgroundService.setWalletPassword();
      setDelegationTxBuilder();
      resetStates();
      removePassword();
      // TODO: Remove this once we pay the `keyAgent.signTransaction` Ledger tech debt up (so we are able to stake multiple times without reloading).
      // if (!isInMemory && isSuccessSection) window.location.reload();
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
    backgroundService,
    setDelegationTxBuilder,
    resetStates,
    removePassword,
    // isInMemory,
    // isSuccessSection,
    setIsDrawerVisible,
    setIsRestaking,
    analytics
  ]);

  const onArrowIconClick = useCallback(() => {
    if (password) {
      backgroundService.setWalletPassword();
      removePassword();
    }
    if (simpleSendConfig.currentSection === Sections.CONFIRMATION && !isInMemory) {
      return setSection(sectionsConfig[Sections.DETAIL]);
    }
    if (simpleSendConfig?.prevSection) {
      return setPrevSection();
    }
    return closeDrawer();
  }, [
    closeDrawer,
    isInMemory,
    password,
    removePassword,
    setPrevSection,
    setSection,
    simpleSendConfig.currentSection,
    simpleSendConfig?.prevSection,
    backgroundService
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
      open={isDrawerVisible}
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
