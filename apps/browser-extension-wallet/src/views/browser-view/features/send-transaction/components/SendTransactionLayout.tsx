/* eslint-disable react/no-multi-comp */
import React, { useCallback, useEffect, useState } from 'react';
import { DrawerContent } from '@src/views/browser-view/components/Drawer/DrawerUIContent';
import { useDrawer } from '@src/views/browser-view/stores';
import { SendWarningModal } from './SendWarningModal';
import { Footer, HeaderNavigation, useHandleClose } from './SendTransactionDrawer';
import styles from './SendTransactionLayout.module.scss';
import {
  useAddressState,
  useCurrentRow,
  useMultipleSelection,
  useResetStore,
  useResetUiStore,
  useSections
} from '../store';
import { Sections } from '../types';
import { useWalletStore } from '@src/stores';
import { HeaderTitle } from './SendTransactionDrawer/HeaderView';
import { withAddressBookContext } from '@src/features/address-book/context';

const FIRST_ROW = 'output1';

export interface SendTransactionLayoutProps {
  isPopupView: boolean;
  children: React.ReactNode;
}

export const SendTransactionLayout = withAddressBookContext(
  ({ children, isPopupView }: SendTransactionLayoutProps): React.ReactElement => {
    const { blockchainProvider } = useWalletStore();
    const { onClose } = useHandleClose();
    const [row] = useCurrentRow();
    const { setAddressValue } = useAddressState(row || FIRST_ROW);

    const [, setIsDrawerVisible] = useDrawer();
    const {
      currentSection: { currentSection },
      resetSection,
      setSection
    } = useSections();
    const reset = useResetStore();
    const resetUi = useResetUiStore();
    // Used to check if the blockchain provider has changed since mount, prevents the drawer from closing or resetting immediately
    const [currentProvider, setCurrentProvider] = useState(blockchainProvider);
    const [multipleSelectionAvailable] = useMultipleSelection();

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

    const shouldAssetPickerDisplayFooter = multipleSelectionAvailable && currentSection === Sections.ASSET_PICKER;

    const changeOnCloseDrawer = useCallback(
      () =>
        setIsDrawerVisible({
          content: DrawerContent.SEND_TRANSACTION,
          wrapperClassName: styles.drawer,
          onClose,
          renderHeader: () => <HeaderNavigation isPopupView={isPopupView} />,
          renderTitle: () => <HeaderTitle popup={isPopupView} />,
          ...(![Sections.ADDRESS_LIST, Sections.ADDRESS_FORM, Sections.ASSET_PICKER].includes(currentSection) ||
          shouldAssetPickerDisplayFooter
            ? {
                renderFooter: () => (
                  <Footer
                    key={currentSection}
                    isPopupView={isPopupView}
                    onHandleChangeConfirm={(action) => {
                      action === 'DELETE' && setAddressValue(row, '');
                      setSection({ currentSection: Sections.FORM, nextSection: Sections.SUMMARY });
                    }}
                  />
                )
              }
            : {})
        }),
      [setIsDrawerVisible, onClose, isPopupView, currentSection, shouldAssetPickerDisplayFooter, setSection] // eslint-disable-line react-hooks/exhaustive-deps
    );

    useEffect(() => changeOnCloseDrawer(), [changeOnCloseDrawer]);

    return (
      <>
        <div className={styles.sendContent}>{children}</div>
        <SendWarningModal isPopupView={isPopupView} />
      </>
    );
  }
);
