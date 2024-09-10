/* eslint-disable react/no-multi-comp */
import React, { useCallback, useEffect, useState } from 'react';
import { useDrawer } from '@src/views/browser-view/stores';
import { SendWarningModal } from './SendWarningModal';
import styles from './SendTransactionLayout.module.scss';
import { useResetStore, useResetUiStore, useSections } from '../store';
import { useWalletStore } from '@src/stores';
import { withAddressBookContext } from '@src/features/address-book/context';

export interface SendTransactionLayoutProps {
  isPopupView: boolean;
  children: React.ReactNode;
}

export const SendTransactionLayout = withAddressBookContext(
  ({ children, isPopupView }: SendTransactionLayoutProps): React.ReactElement => {
    const { blockchainProvider } = useWalletStore();

    const [, setIsDrawerVisible] = useDrawer();
    const { resetSection } = useSections();
    const reset = useResetStore();
    const resetUi = useResetUiStore();
    // Used to check if the blockchain provider has changed since mount, prevents the drawer from closing or resetting immediately
    const [currentProvider, setCurrentProvider] = useState(blockchainProvider);

    const closeDrawer = useCallback(() => {
      setIsDrawerVisible();
      resetUi();
      reset();
      resetSection();
    }, [reset, resetUi, resetSection, setIsDrawerVisible]);

    // TODO: review if there's a better way to do this [LW-5456]
    useEffect(() => {
      // Close and reset send tx drawer data if network (blockchainProvider) has changed since mount.
      if (currentProvider !== blockchainProvider) {
        closeDrawer();
        setCurrentProvider(blockchainProvider);
      }
    }, [closeDrawer, currentProvider, blockchainProvider, setCurrentProvider]);

    return (
      <>
        <div className={styles.sendContent}>{children}</div>
        <SendWarningModal isPopupView={isPopupView} />
      </>
    );
  }
);
