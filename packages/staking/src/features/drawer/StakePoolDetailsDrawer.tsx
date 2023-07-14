import { Wallet } from '@lace/cardano';
import { Drawer, DrawerNavigation, useKeyboardShortcut } from '@lace/common';
import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useOutsideHandles } from '../outside-handles-provider';
import { Sections, sectionsConfig, useStakePoolDetails } from '../store';

export interface StakePoolDetailsDrawerProps {
  children: React.ReactNode;
  footer?: React.ReactNode;
  showCloseIcon?: boolean | ((section: Sections) => boolean);
  showBackIcon?: boolean | ((section: Sections) => boolean);
  showExitConfirmation?: (section: Sections) => boolean;
}

export const StakePoolDetailsDrawer = ({
  children,
  footer,
  showCloseIcon,
  showBackIcon,
  showExitConfirmation,
}: StakePoolDetailsDrawerProps): React.ReactElement => {
  const {
    setExitStakingVisible,
    isDrawerVisible,
    setIsDrawerVisible,
    setSection,
    setPrevSection,
    simpleSendConfig,
    resetStates,
  } = useStakePoolDetails();

  const { t } = useTranslation();

  const {
    backgroundServiceAPIContextSetWalletPassword,
    delegationStoreSetDelegationTxBuilder,
    walletStoreGetKeyAgentType,
    password,
    passwordRemovePassword,
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
      resetStates();
      passwordRemovePassword();
      // TODO: Remove this once we pay the `keyAgent.signTransaction` Ledger tech debt up (so we are able to stake multiple times without reloading).
      // if (!isInMemory && isSuccessSection) window.location.reload();
      setIsDrawerVisible(false);
    }
    setIsRestaking(false);
  }, [
    showExitConfirmation,
    simpleSendConfig.currentSection,
    setExitStakingVisible,
    backgroundServiceAPIContextSetWalletPassword,
    delegationStoreSetDelegationTxBuilder,
    resetStates,
    passwordRemovePassword,
    // isInMemory,
    // isSuccessSection,
    setIsDrawerVisible,
    setIsRestaking,
  ]);

  const onArrowIconClick = useCallback(() => {
    if (password) {
      backgroundServiceAPIContextSetWalletPassword();
      passwordRemovePassword();
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
    passwordRemovePassword,
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
      visible={isDrawerVisible}
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
    >
      {isDrawerVisible && children}
    </Drawer>
  );
};
