import { Drawer, DrawerNavigation, useKeyboardShortcut } from '@lace/common';
import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useOutsideHandles } from '../outside-handles-provider';
import { DrawerDefaultStep, DrawerStep, isDrawerVisible, useDelegationPortfolioStore, useStakingStore } from '../store';

export interface StakePoolDetailsDrawerProps {
  children: React.ReactNode;
  footer?: React.ReactNode;
  popupView?: boolean;
  showBackIcon?: boolean | ((step: DrawerStep) => boolean);
  showCloseIcon?: boolean | ((step: DrawerStep) => boolean);
  showExitConfirmation?: (step: DrawerStep) => boolean;
}

export const StakePoolDetailsDrawer = ({
  children,
  footer,
  popupView,
  showCloseIcon,
  showBackIcon,
  showExitConfirmation,
}: StakePoolDetailsDrawerProps): React.ReactElement => {
  const { setExitStakingVisible } = useStakingStore();
  const { activeDrawerStep, drawerVisible, portfolioMutators } = useDelegationPortfolioStore((store) => ({
    activeDrawerStep: store.activeDrawerStep,
    drawerVisible: isDrawerVisible(store),
    portfolioMutators: store.mutators,
  }));

  const { t } = useTranslation();

  const {
    backgroundServiceAPIContextSetWalletPassword,
    delegationStoreSetDelegationTxBuilder,
    password: { password, removePassword },
    submittingState: { setIsRestaking },
  } = useOutsideHandles();

  const closeDrawer = useCallback(() => {
    if (activeDrawerStep && showExitConfirmation?.(activeDrawerStep)) {
      setExitStakingVisible(true);
    } else {
      backgroundServiceAPIContextSetWalletPassword();
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
    backgroundServiceAPIContextSetWalletPassword,
    delegationStoreSetDelegationTxBuilder,
    removePassword,
    portfolioMutators,
  ]);

  const onGoBack = useCallback(() => {
    if (password) {
      backgroundServiceAPIContextSetWalletPassword();
      removePassword();
    }
    portfolioMutators.executeCommand({
      type: 'DrawerBack',
    });
  }, [password, portfolioMutators, backgroundServiceAPIContextSetWalletPassword, removePassword]);

  useKeyboardShortcut(['Escape'], () => {
    if (activeDrawerStep && typeof showBackIcon === 'function' ? showBackIcon(activeDrawerStep) : showBackIcon) {
      onGoBack();
    } else {
      closeDrawer();
    }
  });

  const createArrowIconCallback = () => {
    if (activeDrawerStep && typeof showBackIcon === 'function' ? showBackIcon(activeDrawerStep) : showBackIcon) {
      return popupView ? closeDrawer : onGoBack;
    }
    // eslint-disable-next-line consistent-return, unicorn/no-useless-undefined
    return undefined;
  };

  return (
    <Drawer
      open={drawerVisible}
      destroyOnClose
      onClose={closeDrawer}
      navigation={
        <DrawerNavigation
          title={DrawerDefaultStep.PoolDetails === activeDrawerStep ? t('drawer.title') : t('drawer.titleSecond')}
          // If undefined is passed to onArrowIconClick, arrow component will not be rendered
          onArrowIconClick={createArrowIconCallback()}
          onCloseIconClick={
            (activeDrawerStep && typeof showCloseIcon === 'function' ? showCloseIcon(activeDrawerStep) : showCloseIcon)
              ? closeDrawer
              : undefined
          }
        />
      }
      footer={footer}
      popupView={popupView}
    >
      {drawerVisible && children}
    </Drawer>
  );
};
