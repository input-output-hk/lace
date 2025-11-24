import { Drawer, DrawerNavigation, useKeyboardShortcut } from '@lace/common';
import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useOutsideHandles } from '../outside-handles-provider';
import {
  DrawerDefaultStep,
  DrawerStep,
  isDrawerVisibleSelector,
  useDelegationPortfolioStore,
  useStakingStore,
} from '../store';

export interface StakePoolDetailsDrawerProps {
  children: React.ReactNode;
  footer?: React.ReactNode;
  popupView?: boolean;
  showBackIcon?: boolean | ((step: DrawerStep) => boolean);
  showCloseIcon?: boolean | ((step: DrawerStep) => boolean);
  showExitConfirmation?: (step: DrawerStep) => boolean;
  onCloseIconClick?: () => void;
  onBackButtonClick?: () => void;
}

export const StakePoolDetailsDrawer = ({
  children,
  footer,
  popupView,
  showCloseIcon,
  showBackIcon,
  showExitConfirmation,
  onCloseIconClick,
  onBackButtonClick,
}: StakePoolDetailsDrawerProps): React.ReactElement => {
  const { setExitStakingVisible } = useStakingStore();
  const { activeDrawerStep, drawerVisible, portfolioMutators } = useDelegationPortfolioStore((store) => ({
    activeDrawerStep: store.activeDrawerStep,
    drawerVisible: isDrawerVisibleSelector(store),
    portfolioMutators: store.mutators,
  }));

  const { t } = useTranslation();

  const {
    delegationStoreSetDelegationTxBuilder,
    password: { password, clearSecrets: removePassword },
    submittingState: { setIsRestaking },
    isSharedWallet,
  } = useOutsideHandles();

  const closeDrawer = useCallback(() => {
    if (activeDrawerStep && showExitConfirmation?.(activeDrawerStep)) {
      setExitStakingVisible(true);
    } else {
      delegationStoreSetDelegationTxBuilder();
      removePassword();
      portfolioMutators.executeCommand({ type: 'CancelDrawer' });
    }
    setIsRestaking(false);
  }, [
    activeDrawerStep,
    showExitConfirmation,
    setIsRestaking,
    setExitStakingVisible,
    delegationStoreSetDelegationTxBuilder,
    removePassword,
    portfolioMutators,
  ]);

  const onGoBack = useCallback(() => {
    if (password) {
      removePassword();
    }
    portfolioMutators.executeCommand({
      type: 'DrawerBack',
    });
  }, [password, portfolioMutators, removePassword]);

  const shouldShowBackIcon =
    activeDrawerStep && typeof showBackIcon === 'function' ? showBackIcon(activeDrawerStep) : showBackIcon;

  useKeyboardShortcut(['Escape'], () => {
    if (shouldShowBackIcon) {
      onGoBack();
    } else {
      closeDrawer();
    }
  });

  const arrowIconCallback = () => {
    if (shouldShowBackIcon) {
      return popupView ? closeDrawer() : onGoBack();
    }
    // eslint-disable-next-line consistent-return, unicorn/no-useless-undefined
    return undefined;
  };

  const sharedWalletTitleKey = isSharedWallet ? 'titleSharedWallet' : 'titleSecond';
  const title =
    DrawerDefaultStep.PoolDetails === activeDrawerStep ? t('drawer.title') : t(`drawer.${sharedWalletTitleKey}`);

  return (
    <Drawer
      visible={drawerVisible}
      destroyOnClose
      onClose={closeDrawer}
      navigation={
        <DrawerNavigation
          title={title}
          // If undefined is passed to onArrowIconClick, arrow component will not be rendered
          onArrowIconClick={
            !shouldShowBackIcon
              ? undefined
              : () => {
                  onBackButtonClick?.();
                  arrowIconCallback();
                }
          }
          onCloseIconClick={() => {
            if (
              activeDrawerStep && typeof showCloseIcon === 'function' ? showCloseIcon(activeDrawerStep) : showCloseIcon
            ) {
              onCloseIconClick?.();
              closeDrawer();
            }
          }}
        />
      }
      footer={footer}
      popupView={popupView}
    >
      {drawerVisible && children}
    </Drawer>
  );
};
