import { Wallet } from '@lace/cardano';
import { Drawer, DrawerNavigation, useKeyboardShortcut } from '@lace/common';
import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useOutsideHandles } from '../outside-handles-provider';
import { Sections, sectionsConfig, useStakePoolDetails } from '../store';
import { isNewDrawerVisible, useNewDelegationPortfolioStore } from '../store/useDelegationPortfolioStore';

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
  showExitConfirmation,
}: StakePoolDetailsDrawerProps): React.ReactElement => {
  const {
    setExitStakingVisible,
    isDrawerVisible: isOldDrawerVisible,
    setSection,
    setPrevSection,
    simpleSendConfig,
  } = useStakePoolDetails();
  const { drawerVisible, portfolioMutators } = useNewDelegationPortfolioStore((store) => ({
    drawerVisible: isNewDrawerVisible(store),
    portfolioMutators: store.mutators,
  }));

  const { t } = useTranslation();

  const {
    backgroundServiceAPIContextSetWalletPassword,
    delegationStoreSetDelegationTxBuilder,
    walletStoreGetKeyAgentType,
    password: { password, removePassword },
    submittingState: { setIsRestaking },
  } = useOutsideHandles();

  const isInMemory = useMemo(
    () => walletStoreGetKeyAgentType() === Wallet.KeyManagement.KeyAgentType.InMemory,
    [walletStoreGetKeyAgentType]
  );

  const closeDrawer = useCallback(() => {
    if (showExitConfirmation?.(simpleSendConfig.currentSection)) {
      setExitStakingVisible(true);
    } else {
      backgroundServiceAPIContextSetWalletPassword();
      delegationStoreSetDelegationTxBuilder();
      removePassword();
      portfolioMutators.executeCommand({ type: 'CommandCommonCancelDrawer' });
    }
    setIsRestaking(false);
  }, [
    showExitConfirmation,
    simpleSendConfig.currentSection,
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
    if (simpleSendConfig.currentSection === Sections.CONFIRMATION && !isInMemory) {
      return setSection(sectionsConfig[Sections.PREFERENCES]);
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
    backgroundServiceAPIContextSetWalletPassword,
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
      visible={drawerVisible}
      destroyOnClose
      onClose={closeDrawer}
      navigation={
        <DrawerNavigation
          title={Sections.DETAIL === simpleSendConfig.currentSection ? t('drawer.title') : t('drawer.titleSecond')}
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
      {drawerVisible && children}
    </Drawer>
  );
};
