import { Drawer, DrawerNavigation, useKeyboardShortcut } from '@lace/common';
import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useOutsideHandles } from '../outside-handles-provider';
import {
  DrawerDefaultStep,
  DrawerStep,
  isNewDrawerVisible,
  useNewDelegationPortfolioStore,
  useStakePoolDetails,
} from '../store';

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
  const { setExitStakingVisible } = useStakePoolDetails();
  const { activeDrawerStep, drawerVisible, portfolioMutators } = useNewDelegationPortfolioStore((store) => ({
    activeDrawerStep: store.activeDrawerStep,
    drawerVisible: isNewDrawerVisible(store),
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
      portfolioMutators.executeCommand({ type: 'CommandCommonCancelDrawer' });
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

  const onArrowIconClick = useCallback(() => {
    if (password) {
      backgroundServiceAPIContextSetWalletPassword();
      removePassword();
    }
    portfolioMutators.executeCommand({
      type: 'CommandCommonDrawerBack',
    });
  }, [password, portfolioMutators, backgroundServiceAPIContextSetWalletPassword, removePassword]);

  useKeyboardShortcut(['Escape'], () => {
    if (activeDrawerStep && typeof showBackIcon === 'function' ? showBackIcon(activeDrawerStep) : showBackIcon) {
      onArrowIconClick();
    } else {
      closeDrawer();
    }
  });

  return (
    <Drawer
      visible={drawerVisible}
      destroyOnClose
      onClose={closeDrawer}
      navigation={
        <DrawerNavigation
          title={DrawerDefaultStep.PoolDetails === activeDrawerStep ? t('drawer.title') : t('drawer.titleSecond')}
          onArrowIconClick={
            (activeDrawerStep && typeof showBackIcon === 'function' ? showBackIcon(activeDrawerStep) : showBackIcon)
              ? onArrowIconClick
              : undefined
          }
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
