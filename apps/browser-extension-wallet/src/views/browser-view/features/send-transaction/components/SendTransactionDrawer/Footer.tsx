/* eslint-disable max-statements */
/* eslint-disable unicorn/no-null */
import React, { useCallback, useMemo, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@lace/common';
import { Wallet } from '@lace/cardano';
import styles from './Footer.module.scss';

import { Sections } from '../../types';
import {
  useSections,
  useBuitTxState,
  useSubmitingState,
  useTransactionProps,
  usePassword,
  useMetadata
} from '../../store';
import { useHandleClose } from './Header';
import { useWalletStore } from '@src/stores';
import { AddressFormFooter } from './AddressFormFooter';
import { METADATA_MAX_LENGTH, sectionsConfig } from '../../constants';
import { useNetwork, useWalletManager } from '@hooks';
import { useAnalyticsContext } from '@providers/AnalyticsProvider/context';
import {
  AnalyticsEventActions,
  AnalyticsEventCategories,
  AnalyticsEventNames
} from '@providers/AnalyticsProvider/analyticsTracker';
import { buttonIds } from '@hooks/useEnterKeyPress';
import { AssetPickerFooter } from './AssetPickerFooter';

const { SendTransaction: Events } = AnalyticsEventNames;

const TEMP_OUTPUTS = 'tempOutputs';
const TEMP_ADDRESS = 'tempAddress';
const TEMP_SOURCE = 'tempSource';

export const nextStepBtnLabels: Partial<Record<Sections, string>> = {
  [Sections.FORM]: 'browserView.transaction.send.footer.review',
  [Sections.SUMMARY]: 'browserView.transaction.send.footer.confirm',
  [Sections.CONFIRMATION]: 'browserView.transaction.send.footer.confirm',
  [Sections.SUCCESS_TX]: 'browserView.transaction.send.footer.viewTransaction',
  [Sections.FAIL_TX]: 'browserView.transaction.send.footer.fail',
  [Sections.ADDRESS_FORM]: 'browserView.transaction.send.footer.save'
};

const hasTempTxData = () => localStorage.getItem(TEMP_OUTPUTS) !== null || localStorage.getItem(TEMP_ADDRESS) !== null;
const tempDataSource = localStorage.getItem(TEMP_SOURCE);

const clearTempData = () => {
  localStorage.removeItem(TEMP_OUTPUTS);
  localStorage.removeItem(TEMP_ADDRESS);
  localStorage.removeItem(TEMP_SOURCE);
};

interface FooterProps {
  isPopupView?: boolean;
  openContinueDialog?: () => void;
}

export const Footer = ({ isPopupView, openContinueDialog }: FooterProps): React.ReactElement => {
  const confirmRef = useRef<HTMLButtonElement>();
  const triggerSubmit = () => confirmRef.current?.click();
  const { t } = useTranslation();
  const { hasInvalidOutputs, outputMap } = useTransactionProps();
  const { builtTxData } = useBuitTxState();
  const { setSection, currentSection } = useSections();
  const { setSubmitingTxState, isSubmitingTx, isPasswordValid } = useSubmitingState();
  const { inMemoryWallet, getKeyAgentType } = useWalletStore();
  const { password, removePassword } = usePassword();
  const [metadata] = useMetadata();
  const { onClose, onCloseSubmitedTransaction } = useHandleClose();
  const { executeWithPassword } = useWalletManager();
  const analytics = useAnalyticsContext();
  const isOnline = useNetwork();

  const sendEvent = useCallback(
    (name: string, value?: number) =>
      analytics.sendEvent({
        action: AnalyticsEventActions.CLICK_EVENT,
        category: AnalyticsEventCategories.SEND_TRANSACTION,
        name,
        value
      }),
    [analytics]
  );

  const isSummaryStep = currentSection.currentSection === Sections.SUMMARY;

  const sendAnalytics = useCallback(() => {
    switch (currentSection.currentSection) {
      case Sections.FORM:
        sendEvent(isPopupView ? Events.REVIEW_TX_DETAILS_POPUP : Events.REVIEW_TX_DETAILS_BROWSER);
        break;
      case Sections.SUMMARY:
        sendEvent(isPopupView ? Events.CONFIRM_TX_DETAILS_POPUP : Events.CONFIRM_TX_DETAILS_BROWSER);
        break;
      case Sections.CONFIRMATION:
        sendEvent(isPopupView ? Events.INPUT_TX_PASSWORD_POPUP : Events.INPUT_TX_PASSWORD_BROWSER);
        break;
      case Sections.SUCCESS_TX:
        sendEvent(isPopupView ? Events.SUCCESS_VIEW_TX_POPUP : Events.SUCCESS_VIEW_TX_BROWSER);
        break;
      case Sections.FAIL_TX:
        sendEvent(isPopupView ? Events.FAIL_BACK_POPUP : Events.FAIL_BACK_BROWSER);
    }
  }, [currentSection.currentSection, isPopupView, sendEvent]);

  const keyAgentType = getKeyAgentType();
  const isInMemory = useMemo(() => keyAgentType === Wallet.KeyManagement.KeyAgentType.InMemory, [keyAgentType]);
  const isHwSummary = useMemo(() => isSummaryStep && !isInMemory, [isSummaryStep, isInMemory]);

  const signAndSubmitTransaction = useCallback(async () => {
    const signedTx = await inMemoryWallet.finalizeTx({
      tx: builtTxData.tx,
      ...(builtTxData?.auxiliaryData && {
        auxiliaryData: builtTxData.auxiliaryData
      })
    });
    await inMemoryWallet.submitTx(signedTx);
  }, [inMemoryWallet, builtTxData?.tx, builtTxData?.auxiliaryData]);

  const handleVerifyPass = useCallback(async () => {
    if (isSubmitingTx) return;

    setSubmitingTxState({ isPasswordValid: true, isSubmitingTx: true });
    try {
      await signAndSubmitTransaction();
      removePassword();
      // Send amount of bundles as value
      sendEvent(isPopupView ? Events.TX_SUCCESS_POPUP : Events.TX_SUCCESS_BROWSER, outputMap.size);
      setSection({ currentSection: Sections.SUCCESS_TX });
      setSubmitingTxState({ isPasswordValid: true, isSubmitingTx: false });
    } catch (error) {
      removePassword();
      // Error name is 'AuthenticationError' in dev build but 'W' in prod build
      if (error.message?.includes('Authentication failure')) {
        setSubmitingTxState({ isPasswordValid: false, isSubmitingTx: false });
      } else {
        // TODO: identify the errors and give them a value to send it with the event and track it [LW-6497]
        sendEvent(isPopupView ? Events.TX_FAIL_POPUP : Events.TX_FAIL_BROWSER);
        setSection({ currentSection: Sections.FAIL_TX });
        setSubmitingTxState({ isSubmitingTx: false });
      }
    }
  }, [
    isPopupView,
    isSubmitingTx,
    outputMap,
    removePassword,
    sendEvent,
    setSection,
    setSubmitingTxState,
    signAndSubmitTransaction
  ]);

  const onConfirm = useCallback(() => {
    sendAnalytics();
    const isConfirmPass = currentSection.currentSection === Sections.CONFIRMATION;
    const txHasSucceeded = currentSection.currentSection === Sections.SUCCESS_TX;
    const txHasFailed = currentSection.currentSection === Sections.FAIL_TX;

    if (hasTempTxData()) {
      clearTempData();
    }

    switch (true) {
      case isSummaryStep && !isInMemory:
        if (isPopupView) {
          return openContinueDialog();
        }
        return handleVerifyPass();
      case isConfirmPass:
        return executeWithPassword(password, handleVerifyPass);
      case txHasSucceeded:
        return onCloseSubmitedTransaction();
      case txHasFailed:
        setSubmitingTxState({ isPasswordValid: true });
        return setSection(sectionsConfig.form);
      default:
        return setSection();
    }
  }, [
    currentSection.currentSection,
    isSummaryStep,
    isInMemory,
    isPopupView,
    handleVerifyPass,
    executeWithPassword,
    password,
    onCloseSubmitedTransaction,
    setSubmitingTxState,
    setSection,
    openContinueDialog,
    sendAnalytics
  ]);

  const confirmDisable = useMemo(
    () => !builtTxData.tx || hasInvalidOutputs || metadata?.length > METADATA_MAX_LENGTH,
    [builtTxData.tx, hasInvalidOutputs, metadata]
  );
  const isSubmitDisabled = useMemo(
    () =>
      currentSection.currentSection === Sections.CONFIRMATION &&
      (isSubmitingTx || !isPasswordValid || !password || !isOnline),
    [currentSection.currentSection, isSubmitingTx, isPasswordValid, password, isOnline]
  );
  const confirmButtonLabel = useMemo(() => {
    if (isHwSummary) {
      const staleLabels = isPopupView
        ? t('browserView.transaction.send.footer.continueInAdvancedView')
        : t('browserView.transaction.send.footer.confirmWithDevice', { hardwareWallet: keyAgentType });
      return isSubmitingTx ? t('browserView.transaction.send.footer.signing') : staleLabels;
    }

    return t(nextStepBtnLabels[currentSection.currentSection]);
  }, [isHwSummary, t, currentSection.currentSection, isPopupView, isSubmitingTx, keyAgentType]);

  const isConfirmButtonDisabled = confirmDisable || isSubmitDisabled;

  const submitHwFormStep = useCallback(() => {
    triggerSubmit();
  }, []);

  /* eslint-disable consistent-return */
  useEffect(() => {
    const cleanup = () => {
      if (hasTempTxData()) {
        clearTempData();
      }
    };
    if (isPopupView) return cleanup;
    if (isSubmitingTx) return cleanup;
    if (isConfirmButtonDisabled) return cleanup;
    if (hasTempTxData() && tempDataSource === 'hardware-wallet') {
      submitHwFormStep();
    }
  }, [isConfirmButtonDisabled, isHwSummary, isPopupView, isSubmitingTx, submitHwFormStep]);
  /* eslint-enable consistent-return */

  if ([Sections.ADDRESS_LIST, Sections.ADDRESS_FORM].includes(currentSection.currentSection)) return null;

  if (currentSection.currentSection === Sections.ASSET_PICKER) return <AssetPickerFooter />;

  if (currentSection.currentSection === Sections.ADDRESS_FORM) return <AddressFormFooter />;

  return (
    <div className={styles.footer}>
      <Button
        size="large"
        block
        disabled={isConfirmButtonDisabled}
        loading={isSubmitingTx}
        onClick={onConfirm}
        ref={confirmRef}
        id={buttonIds.sendNextBtnId}
        data-testid="send-next-btn"
      >
        {confirmButtonLabel}
      </Button>
      <Button color="secondary" size="large" block onClick={onClose} data-testid="send-cancel-btn">
        {currentSection.currentSection === Sections.SUCCESS_TX
          ? t('browserView.transaction.send.footer.close')
          : t('browserView.transaction.send.footer.cancel')}
      </Button>
    </div>
  );
};
