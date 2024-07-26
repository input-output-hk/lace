import React, { useState } from 'react';
import {
  Transaction,
  useCoinStateSelector,
  useAddressState,
  useSections,
  Sections,
  useMultipleSelection
} from '@src/views/browser-view/features/send-transaction';
import {
  Footer,
  HeaderNavigation
} from '@src/views/browser-view/features/send-transaction/components/SendTransactionDrawer';
import { Drawer } from '@lace/common';
import { BrowserViewSections } from '@lib/scripts/types';
import { ContinueInBrowserDialog } from '@components/ContinueInBrowserDialog';
import { useTranslation } from 'react-i18next';
import { useBackgroundServiceAPIContext } from '@providers/BackgroundServiceAPI';
import { HeaderTitle } from '@src/views/browser-view/features/send-transaction/components/SendTransactionDrawer/HeaderView';
import styles from './Send.module.scss';
import { saveTemporaryTxDataInStorage } from '@src/views/browser-view/features/send-transaction/helpers';

const FIRST_ROW = 'output1';

export const Send = (): React.ReactElement => {
  const { t } = useTranslation();
  const [isContinueDialogVisible, setIsContinueDialogVisible] = useState(false);
  const toggleContinueDialog = () => setIsContinueDialogVisible(!isContinueDialogVisible);
  const {
    currentSection: { currentSection: section },
    setSection
  } = useSections();
  const backgroundServices = useBackgroundServiceAPIContext();
  const [multipleSelectionAvailable] = useMultipleSelection();

  const { uiOutputs } = useCoinStateSelector(FIRST_ROW);
  const { address } = useAddressState(FIRST_ROW);

  const openTabExtensionSendFlow = (): Promise<void> => {
    saveTemporaryTxDataInStorage({ tempAddress: address, tempOutputs: uiOutputs, tempSource: 'hardware-wallet' });
    return backgroundServices.handleOpenBrowser({ section: BrowserViewSections.SEND_ADVANCED });
  };

  const shouldAssetPickerDisplayFooter = multipleSelectionAvailable && section === Sections.ASSET_PICKER;
  const shouldDisplayFooter =
    ![Sections.ADDRESS_LIST, Sections.ADDRESS_FORM, Sections.ASSET_PICKER].includes(section) ||
    shouldAssetPickerDisplayFooter;

  return (
    <>
      <ContinueInBrowserDialog
        visible={isContinueDialogVisible}
        onConfirm={openTabExtensionSendFlow}
        onClose={toggleContinueDialog}
        title={t('browserView.onboarding.hardwareWalletSendTransition.title')}
        description={t('browserView.onboarding.hardwareWalletSendTransition.description')}
        okLabel={t('browserView.onboarding.hardwareWalletSendTransition.ok')}
        cancelLabel={t('browserView.onboarding.hardwareWalletSendTransition.cancel')}
      />
      <Drawer
        visible
        navigation={<HeaderNavigation isPopupView />}
        title={
          <div className={styles.headerTitleContainer}>
            <HeaderTitle popup />
          </div>
        }
        footer={
          shouldDisplayFooter && (
            <Footer
              isPopupView
              openContinueDialog={toggleContinueDialog}
              onHandleChangeConfirm={() => setSection({ currentSection: Sections.FORM, nextSection: Sections.SUMMARY })}
            />
          )
        }
        popupView
      >
        <Transaction isPopupView />
      </Drawer>
    </>
  );
};
