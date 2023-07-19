/* eslint-disable complexity */
/* eslint-disable unicorn/no-null */
/* eslint-disable sonarjs/cognitive-complexity */
/* eslint-disable react/no-multi-comp */
/* eslint-disable unicorn/no-nested-ternary */
import React, { useCallback, useMemo } from 'react';
import styles from './Header.module.scss';
import { BrowserViewSections } from '@src/lib/scripts/types';
import { NavigationButton, Button, DrawerNavigation, DrawerHeader } from '@lace/common';
import { Wallet } from '@lace/cardano';
import { Sections } from '../../types';
import {
  useSections,
  useWarningModal,
  useResetStore,
  useResetUiStore,
  useTransactionProps,
  usePassword,
  useSubmitingState,
  useMultipleSelection,
  useSelectedTokenList
} from '../../store';
import { useCoinStateSelector, useAddressState } from '@src/views/browser-view/features/send-transaction';
import { useDrawer } from '@src/views/browser-view/stores';
import { useTranslation } from 'react-i18next';
import { useRedirection } from '@hooks';
import { walletRoutePaths } from '@routes';
import { useBackgroundServiceAPIContext } from '@providers/BackgroundServiceAPI';
import { useAnalyticsContext } from '@providers';
import {
  AnalyticsEventActions,
  AnalyticsEventCategories,
  AnalyticsEventNames
} from '@providers/AnalyticsProvider/analyticsTracker';

import { useWalletStore } from '@src/stores';
import { APP_MODE_POPUP } from '@src/utils/constants';
import { SelectTokenButton } from '@components/AssetSelectionButton/SelectTokensButton';
import { AssetsCounter } from '@components/AssetSelectionButton/AssetCounter';

const { SendTransaction: Events } = AnalyticsEventNames;

export const useHandleClose = (): {
  onClose: () => void;
  onCloseSubmitedTransaction: () => void;
} => {
  const {
    walletUI: { appMode },
    getKeyAgentType
  } = useWalletStore();
  const isPopup = appMode === APP_MODE_POPUP;
  const [, setWarnigModalVisibility] = useWarningModal();
  const reset = useResetStore();
  const resetUi = useResetUiStore();
  const { hasOutput } = useTransactionProps();
  const [, setIsDrawerVisible] = useDrawer();
  const { currentSection: section, resetSection } = useSections();
  const reditectToTransactions = useRedirection(walletRoutePaths.activity);
  const reditectToOverview = useRedirection(walletRoutePaths.assets);
  const isInMemory = useMemo(() => getKeyAgentType() === Wallet.KeyManagement.KeyAgentType.InMemory, [getKeyAgentType]);

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
    reditectToOverview();
  }, [resetStates, reditectToOverview]);

  const onCloseSubmitedTransaction = useCallback(() => {
    if (isPopup) {
      resetStates();
      reditectToTransactions();
    } else {
      closeDrawer();
      reditectToTransactions();
    }
    // TODO: Remove this once we pay the `keyAgent.signTransaction` Ledger tech debt up (so we are able to sign tx multiple times without reloading).
    if (!isInMemory) window.location.reload();
  }, [closeDrawer, isInMemory, isPopup, reditectToTransactions, resetStates]);

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
      if (!isInMemory) window.location.reload();
    } else {
      onCloseWhileCreating();
    }
  }, [section.currentSection, isPopup, redirect, closeDrawer, isInMemory, onCloseWhileCreating]);

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
}

const FIRST_ROW = 'output1';

export const HeaderNavigation = ({ isPopupView }: HeaderNavigationProps): React.ReactElement => {
  const { t } = useTranslation();
  const { onClose } = useHandleClose();
  const { currentSection: section, setPrevSection } = useSections();
  const { password, removePassword } = usePassword();
  const backgroundServices = useBackgroundServiceAPIContext();
  const { setSubmitingTxState } = useSubmitingState();
  const analytics = useAnalyticsContext();
  const [isMultipleSelectionAvailable, setMultipleSelection] = useMultipleSelection();
  const { selectedTokenList, resetTokenList } = useSelectedTokenList();

  const sendAnalytics = useCallback(() => {
    if (section.currentSection === Sections.SUMMARY) {
      analytics.sendEvent({
        action: AnalyticsEventActions.CLICK_EVENT,
        category: AnalyticsEventCategories.SEND_TRANSACTION,
        name: isPopupView ? Events.BACK_TX_DETAILS_POPUP : Events.BACK_TX_DETAILS_BROWSER
      });
    }
  }, [section.currentSection, analytics, isPopupView]);

  const shouldRenderArrow = isPopupView
    ? [...sectionsWithArrowIcon, Sections.FORM].includes(section.currentSection)
    : sectionsWithArrowIcon.includes(section.currentSection);

  const shouldDisplayAdvancedBtn = isPopupView && section.currentSection === Sections.FORM;
  const shouldDisplayMutlipleSelectionBtn = isPopupView && section.currentSection === Sections.ASSET_PICKER;

  const shouldRenderCross = !sectionsWithoutCrossIcon.has(section.currentSection);

  const onArrowIconClick = () => {
    sendAnalytics();
    const shouldRedirect =
      isPopupView && [Sections.SUCCESS_TX, Sections.FORM, Sections.FAIL_TX].includes(section.currentSection);
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

  const { uiOutputs } = useCoinStateSelector(FIRST_ROW);
  const { address } = useAddressState(FIRST_ROW);

  const openTabExtensionSendFlow = () => {
    localStorage.setItem('tempAddress', address);
    localStorage.setItem('tempOutputs', JSON.stringify(uiOutputs));
    localStorage.setItem('tempSource', 'popup');
    backgroundServices.handleOpenBrowser({ section: BrowserViewSections.SEND_ADVANCED });
  };

  const selectedTokenLabel =
    selectedTokenList.length > 0 ? t('multipleSelection.clear') : t('multipleSelection.cancel');

  const selectedTokenClick =
    selectedTokenList.length > 0 ? resetTokenList : () => setMultipleSelection(!isMultipleSelectionAvailable);

  return (
    <DrawerNavigation
      title={!isPopupView ? <div>{t('core.sendReceive.send')}</div> : undefined}
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
          <NavigationButton icon="cross" onClick={onClose} />
        ) : undefined
      }
    />
  );
};

export const headerText: Record<Sections, { title: string; subtitle?: string }> = {
  [Sections.FORM]: { title: 'browserView.transaction.send.drawer.newTransaction' },
  [Sections.SUMMARY]: {
    title: 'browserView.transaction.send.drawer.transactionSummary',
    subtitle: 'browserView.transaction.send.drawer.breakdownOfYourTransactionCost'
  },
  [Sections.CONFIRMATION]: {
    title: 'browserView.transaction.send.confirmationTitle',
    subtitle: 'browserView.transaction.send.signTransactionWithPassword'
  },
  [Sections.SUCCESS_TX]: { title: '' },
  [Sections.FAIL_TX]: { title: '' },
  [Sections.ADDRESS_LIST]: { title: 'browserView.transaction.send.drawer.addressBook' },
  [Sections.ADDRESS_FORM]: { title: 'browserView.transaction.send.drawer.addressForm' },
  [Sections.ASSET_PICKER]: { title: 'core.coinInputSelection.assetSelection' }
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

  const shouldDisplayTitle = ![Sections.FORM, Sections.FAIL_TX].includes(section.currentSection);
  const title = shouldDisplayTitle ? t(headerText[section.currentSection].title) : undefined;
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
