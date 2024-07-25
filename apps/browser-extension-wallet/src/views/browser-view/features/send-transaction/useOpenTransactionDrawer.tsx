/* eslint-disable react/no-multi-comp */
import React from 'react';
import { DrawerContent } from '@src/views/browser-view/components/Drawer/DrawerUIContent';
import { Footer, HeaderNavigation, useHandleClose } from './components/SendTransactionDrawer';
import { getTransactionSectionsHook, useAddressState, useCurrentRow, useMultipleSelection } from './store';
import { Sections } from './types';
import { HeaderTitle } from './components/SendTransactionDrawer/HeaderView';
import styles from './useOpenTransactionDrawer.module.scss';
import { useDrawer } from '@views/browser/stores';

const FIRST_ROW = 'output1';

type UseTransactionDrawerConfigParams = {
  content?: DrawerContent.SEND_TRANSACTION | DrawerContent.CO_SIGN_TRANSACTION;
  isPopupView?: boolean;
};

export const useOpenTransactionDrawer = ({
  content = DrawerContent.SEND_TRANSACTION,
  isPopupView = false
}: UseTransactionDrawerConfigParams = {}): (() => void) => {
  const [, setDrawerConfig] = useDrawer();
  const { onClose } = useHandleClose();
  const [row] = useCurrentRow();
  const { setAddressValue } = useAddressState(row || FIRST_ROW);
  const useTransactionSections = getTransactionSectionsHook(content);
  const {
    currentSection: { currentSection },
    setSection
  } = useTransactionSections();
  const [multipleSelectionAvailable] = useMultipleSelection();
  const shouldAssetPickerDisplayFooter = multipleSelectionAvailable && currentSection === Sections.ASSET_PICKER;

  const shouldRenderFooter =
    ![
      Sections.ADDRESS_LIST,
      Sections.ADDRESS_FORM,
      Sections.ASSET_PICKER,
      Sections.IMPORT_SHARED_WALLET_TRANSACTION_JSON
    ].includes(currentSection) || shouldAssetPickerDisplayFooter;

  return () => {
    setDrawerConfig({
      content,
      wrapperClassName: styles.drawer,
      onClose,
      renderHeader: () => <HeaderNavigation isPopupView={isPopupView} />,
      renderTitle: () => <HeaderTitle popup={isPopupView} />,
      ...(shouldRenderFooter
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
    });
  };
};
