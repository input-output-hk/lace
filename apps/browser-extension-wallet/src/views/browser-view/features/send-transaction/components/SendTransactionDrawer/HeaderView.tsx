/* eslint-disable camelcase */
/* eslint-disable complexity */
/* eslint-disable unicorn/no-null */
/* eslint-disable sonarjs/cognitive-complexity */
/* eslint-disable react/no-multi-comp */
/* eslint-disable unicorn/no-nested-ternary */
import React, { useCallback } from 'react';
import styles from './Header.module.scss';
import { BrowserViewSections } from '@src/lib/scripts/types';
import { NavigationButton, Button, DrawerNavigation, DrawerHeader } from '@lace/common';
import { Sections } from '../../types';
import {
  useSections,
  useWarningModal,
  useResetStore,
  useResetUiStore,
  useTransactionProps,
  useSubmitingState,
  useMultipleSelection,
  useSelectedTokenList,
  useAnalyticsSendFlowTriggerPoint
} from '../../store';
import { useCoinStateSelector, useAddressState } from '@src/views/browser-view/features/send-transaction';
import { useDrawer } from '@src/views/browser-view/stores';
import { useTranslation } from 'react-i18next';
import { useRedirection } from '@hooks';
import { walletRoutePaths } from '@routes';
import { useBackgroundServiceAPIContext } from '@providers/BackgroundServiceAPI';
import { useAnalyticsContext } from '@providers';
import { PostHogAction, TX_CREATION_TYPE_KEY, TxCreationType } from '@providers/AnalyticsProvider/analyticsTracker';

import { useWalletStore } from '@src/stores';
import { APP_MODE_POPUP } from '@src/utils/constants';
import { SelectTokenButton } from '@components/AssetSelectionButton/SelectTokensButton';
import { AssetsCounter } from '@components/AssetSelectionButton/AssetCounter';
import { saveTemporaryTxDataInStorage } from '../../helpers';
import { useAddressBookStore } from '@src/features/address-book/store';
import type { TranslationKey } from '@lace/translation';
import { DrawerContent } from '@views/browser/components/Drawer';
import { useSecrets } from '@lace/core';

export const useHandleClose = (): {
  onClose: () => void;
  onCloseSubmitedTransaction: () => void;
} => {
  const {
    walletUI: { appMode },
    isInMemoryWallet
  } = useWalletStore();
  const isPopup = appMode === APP_MODE_POPUP;
  const [, setWarnigModalVisibility] = useWarningModal();
  const reset = useResetStore();
  const resetUi = useResetUiStore();
  const { hasOutput } = useTransactionProps();
  const [, setIsDrawerVisible] = useDrawer();
  const { currentSection: section, resetSection } = useSections();
  const redirectToTransactions = useRedirection(walletRoutePaths.activity);
  const redirectToOverview = useRedirection(walletRoutePaths.assets);

  const resetStates = useCallback(() => {
    reset();
    resetUi();
    resetSection();
  }, [reset, resetUi, resetSection]);

  const closeDrawer = useCallback(() => {
    resetStates();
    setIsDrawerVisible();
  }, [resetStates, setIsDrawerVisible]);

  const redirect = useCallback(() => {
    resetStates();
    redirectToOverview();
  }, [resetStates, redirectToOverview]);

  const onCloseSubmitedTransaction = useCallback(() => {
    if (isPopup) {
      resetStates();
      redirectToTransactions();
    } else {
      closeDrawer();
      redirectToTransactions();
    }
    // TODO: Remove this once we pay the `keyAgent.signTransaction` Ledger tech debt up (so we are able to sign tx multiple times without reloading).
    if (!isInMemoryWallet) window.location.reload();
  }, [closeDrawer, isInMemoryWallet, isPopup, redirectToTransactions, resetStates]);

  const onCloseWhileCreating = useCallback(() => {
    if (hasOutput) {
      setWarnigModalVisibility(true);
    } else {
      isPopup ? redirect() : closeDrawer();
    }
  }, [hasOutput, setWarnigModalVisibility, isPopup, redirect, closeDrawer]);

  const onClose = useCallback(() => {
    if (section.currentSection === Sections.SUCCESS_TX) {
      isPopup ? redirect() : closeDrawer();
      if (!isInMemoryWallet) window.location.reload();
    } else {
      onCloseWhileCreating();
    }
  }, [section.currentSection, isPopup, redirect, closeDrawer, isInMemoryWallet, onCloseWhileCreating]);

  return { onClose, onCloseSubmitedTransaction };
};

export const sectionsWithArrowIcon = [
  Sections.SUMMARY,
  Sections.ADDRESS_LIST,
  Sections.ADDRESS_FORM,
  Sections.CONFIRMATION,
  Sections.ASSET_PICKER
];

const sectionsWithoutCrossIcon = new Set([Sections.ASSET_PICKER, Sections.ADDRESS_LIST]);

interface HeaderNavigationProps {
  isPopupView?: boolean;
  flow?: DrawerContent.SEND_TRANSACTION | DrawerContent.CO_SIGN_TRANSACTION;
}

const FIRST_ROW = 'output1';

export const HeaderNavigation = ({
  isPopupView,
  flow = DrawerContent.SEND_TRANSACTION
}: HeaderNavigationProps): React.ReactElement => {
  const { t } = useTranslation();
  const { onClose } = useHandleClose();
  const { currentSection: section, setPrevSection } = useSections();
  const { password, clearSecrets: removePassword } = useSecrets();
  const backgroundServices = useBackgroundServiceAPIContext();
  const { setSubmitingTxState } = useSubmitingState();
  const analytics = useAnalyticsContext();
  const [isMultipleSelectionAvailable, setMultipleSelection] = useMultipleSelection();
  const { selectedTokenList, resetTokenList } = useSelectedTokenList();
  const { triggerPoint } = useAnalyticsSendFlowTriggerPoint();
  const { isSharedWallet } = useWalletStore();

  const shouldRenderArrow = isPopupView
    ? [...sectionsWithArrowIcon, Sections.FORM].includes(section.currentSection)
    : sectionsWithArrowIcon.includes(section.currentSection);

  const shouldDisplayAdvancedBtn = isPopupView && section.currentSection === Sections.FORM;
  const shouldDisplayMutlipleSelectionBtn = isPopupView && section.currentSection === Sections.ASSET_PICKER;

  const shouldRenderCross = !sectionsWithoutCrossIcon.has(section.currentSection);

  const onArrowIconClick = () => {
    const shouldRedirect =
      isPopupView &&
      [Sections.SUCCESS_TX, Sections.FORM, Sections.FAIL_TX, Sections.UNAUTHORIZED_TX].includes(section.currentSection);
    if (password) {
      removePassword();
      setSubmitingTxState({ isPasswordValid: true });
    }

    // FIXME: handle diff scenarios per opened tab
    if (section.currentSection === Sections.ASSET_PICKER) {
      setMultipleSelection(false);
    }

    if (shouldRedirect) {
      onClose();
    } else {
      setPrevSection();
    }
  };

  const onCrossIconClick = () => {
    if (section.currentSection === Sections.SUCCESS_TX) {
      analytics.sendEventToPostHog(
        PostHogAction[isSharedWallet ? 'SharedWalletsSendAllDoneXClick' : 'SendAllDoneXClick'],
        {
          trigger_point: triggerPoint,
          [TX_CREATION_TYPE_KEY]: TxCreationType.Internal
        }
      );
    } else if (section.currentSection === Sections.FAIL_TX || section.currentSection === Sections.UNAUTHORIZED_TX) {
      analytics.sendEventToPostHog(
        PostHogAction[isSharedWallet ? 'SharedWalletsSendSomethingWentWrongXClick' : 'SendSomethingWentWrongXClick'],
        {
          trigger_point: triggerPoint,
          [TX_CREATION_TYPE_KEY]: TxCreationType.Internal
        }
      );
    }
    onClose();
  };

  const { uiOutputs } = useCoinStateSelector(FIRST_ROW);
  const { address } = useAddressState(FIRST_ROW);

  const openTabExtensionSendFlow = () => {
    saveTemporaryTxDataInStorage({ tempAddress: address, tempOutputs: uiOutputs, tempSource: 'popup' });
    backgroundServices.handleOpenBrowser({ section: BrowserViewSections.SEND_ADVANCED });
  };

  const selectedTokenLabel =
    selectedTokenList.length > 0 ? t('multipleSelection.clear') : t('multipleSelection.cancel');

  const selectedTokenClick =
    selectedTokenList.length > 0 ? resetTokenList : () => setMultipleSelection(!isMultipleSelectionAvailable);

  const headerTitle = {
    [DrawerContent.SEND_TRANSACTION]: t('browserView.transaction.send.drawer.send'),
    [DrawerContent.CO_SIGN_TRANSACTION]: t('browserView.transaction.send.drawer.coSignTransaction')
  };

  return (
    <DrawerNavigation
      title={!isPopupView ? <div>{headerTitle[flow]}</div> : undefined}
      onArrowIconClick={shouldRenderArrow ? onArrowIconClick : undefined}
      rightActions={
        shouldDisplayAdvancedBtn ? (
          <Button
            className={styles.customSizeBtn}
            color="secondary"
            variant="outlined"
            onClick={openTabExtensionSendFlow}
            data-testid="add-bundle-button"
          >
            {t('browserView.transaction.send.drawer.addBundle')}
          </Button>
        ) : shouldDisplayMutlipleSelectionBtn ? (
          <SelectTokenButton
            testId={
              isMultipleSelectionAvailable
                ? selectedTokenList.length > 0
                  ? 'clear-button'
                  : 'cancel-button'
                : 'select-multiple-button'
            }
            label={isMultipleSelectionAvailable ? selectedTokenLabel : t('multipleSelection.selectMultiple')}
            onClick={selectedTokenClick}
            btnStyle={
              isMultipleSelectionAvailable
                ? { width: '112px', minWidth: '112px' }
                : { width: '152px', minWidth: '152px' }
            }
          />
        ) : shouldRenderCross ? (
          <NavigationButton icon="cross" onClick={onCrossIconClick} />
        ) : undefined
      }
    />
  );
};

export const useGetHeaderText = (): Record<
  Sections,
  { title?: TranslationKey; subtitle?: TranslationKey; name?: string }
> => {
  const { addressToEdit } = useAddressBookStore();
  const { isSharedWallet } = useWalletStore();

  return {
    [Sections.FORM]: { title: 'browserView.transaction.send.drawer.newTransaction' },
    [Sections.IMPORT_SHARED_WALLET_TRANSACTION_JSON]: {},
    [Sections.SUMMARY]: isSharedWallet
      ? {}
      : {
          title: 'browserView.transaction.send.drawer.transactionSummary',
          subtitle: 'browserView.transaction.send.drawer.breakdownOfYourTransactionCost'
        },
    [Sections.CONFIRMATION]: {
      title: 'browserView.transaction.send.confirmationTitle',
      subtitle: 'browserView.transaction.send.signTransactionWithPassword'
    },
    [Sections.SUCCESS_TX]: {},
    [Sections.FAIL_TX]: {},
    [Sections.UNAUTHORIZED_TX]: {},
    [Sections.ADDRESS_LIST]: { title: 'browserView.transaction.send.drawer.addressBook' },
    [Sections.ADDRESS_FORM]: { title: 'browserView.transaction.send.drawer.addressForm' },
    [Sections.ASSET_PICKER]: { title: 'core.coinInputSelection.assetSelection' },
    [Sections.ADDRESS_CHANGE]: { title: 'addressBook.reviewModal.title', name: addressToEdit.name }
  };
};

export const HeaderTitle = ({
  popup,
  titleSlot
}: {
  popup: boolean;
  titleSlot?: React.ReactElement;
}): React.ReactElement => {
  const { t } = useTranslation();
  const { currentSection: section } = useSections();
  const [isMultipleSelectionAvailable, setMultipleSelection] = useMultipleSelection();
  const { selectedTokenList, resetTokenList } = useSelectedTokenList();
  const headerText = useGetHeaderText();
  const shouldDisplayTitle = ![Sections.FORM, Sections.FAIL_TX, Sections.UNAUTHORIZED_TX].includes(
    section.currentSection
  );
  const title =
    shouldDisplayTitle && headerText[section.currentSection]?.title
      ? t(headerText[section.currentSection].title, { name: headerText[section.currentSection].name })
      : undefined;
  const subtitle = headerText[section.currentSection]?.subtitle
    ? t(headerText[section.currentSection].subtitle)
    : undefined;

  const selectedTokenLabel =
    selectedTokenList.length > 0 ? t('multipleSelection.clear') : t('multipleSelection.cancel');

  const selectedTokenClick =
    selectedTokenList.length > 0 ? resetTokenList : () => setMultipleSelection(!isMultipleSelectionAvailable);

  const MultipleAssetPickerHeader = popup ? (
    selectedTokenList.length > 0 ? (
      <AssetsCounter count={selectedTokenList.length} />
    ) : null
  ) : (
    <SelectTokenButton
      testId={
        isMultipleSelectionAvailable
          ? selectedTokenList.length > 0
            ? 'clear-button'
            : 'cancel-button'
          : 'select-multiple-button'
      }
      count={selectedTokenList.length > 0 ? selectedTokenList.length : undefined}
      label={isMultipleSelectionAvailable ? selectedTokenLabel : t('multipleSelection.selectMultiple')}
      onClick={selectedTokenClick}
      btnStyle={isMultipleSelectionAvailable ? { width: '112px' } : { width: '152px' }}
    />
  );

  return (
    shouldDisplayTitle && (
      <DrawerHeader
        popupView={popup}
        title={
          <div className={styles.header}>
            <div className={styles.title}>{title}</div>
            {titleSlot}
            {section.currentSection === Sections.ASSET_PICKER && MultipleAssetPickerHeader}
          </div>
        }
        subtitle={subtitle}
      />
    )
  );
};
