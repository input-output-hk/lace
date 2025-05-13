/* eslint-disable react/no-multi-comp */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useSignMessageState } from './useSignMessageState';
import { useDrawerConfiguration } from './useDrawerConfiguration';
import { WalletOwnAddressDropdown, Password as PasswordInput, useSecrets, shortenWalletOwnAddress } from '@lace/core';
import { TextArea, PostHogAction, toast, useAutoFocus } from '@lace/common';
import { Box, Flex, SummaryExpander, Text, TransactionSummary } from '@input-output-hk/lace-ui-toolkit';
import { useTranslation } from 'react-i18next';
import { useAnalyticsContext } from '@providers';
import styles from './SignMessageDrawer.module.scss';
import { MainLoader } from '@components/MainLoader';
import { ResultMessage } from '@components/ResultMessage';
import CheckSuccessImg from '@assets/icons/circle-check-gradient.svg';
import CopyToClipboardImg from '@assets/icons/copy.component.svg';
import CopyToClipboard from 'react-copy-to-clipboard';
import { TFunction } from 'i18next';

const renderCopyToClipboard = ({
  text,
  handleCopy,
  t,
  testId
}: {
  text: string;
  handleCopy: () => void;
  t: TFunction;
  testId?: string;
}) => (
  <CopyToClipboard text={text}>
    <Box className={styles.copyButton} onClick={handleCopy}>
      <Text.Button color="accent" weight="$semibold" data-testid={testId ?? 'copy-to-clipboard-button'}>
        <Flex alignItems="center">
          <CopyToClipboardImg className={styles.copyIcon} />
          {t('core.signMessage.copyToClipboard')}
        </Flex>
      </Text.Button>
    </Box>
  </CopyToClipboard>
);

const inputId = `id-${uuidv4()}`;

export const SignMessageDrawer: React.FC = () => {
  const { t } = useTranslation();
  const analytics = useAnalyticsContext();
  const {
    usedAddresses,
    isSigningInProgress,
    signatureObject,
    error,
    errorObj,
    hardwareWalletError,
    isHardwareWallet,
    performSigning,
    resetSigningState
  } = useSignMessageState();
  const { password, setPassword, clearSecrets } = useSecrets();
  const [selectedAddress, setSelectedAddress] = useState('');
  const [message, setMessage] = useState('');
  const [shouldShowPasswordPrompt, setShouldShowPasswordPrompt] = useState(false);
  const [showHardwareSigningError, setShowHardwareSigningError] = useState(false);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  // Create a ref to access password without creating dependencies
  const passwordRef = useRef(password);
  passwordRef.current = password;

  useEffect(() => {
    if (error) {
      isHardwareWallet ? setShowHardwareSigningError(true) : setShouldShowPasswordPrompt(true);
    }
  }, [error, isHardwareWallet]);

  const handleSign = useCallback(() => {
    if (!isHardwareWallet && !passwordRef.current.value) {
      analytics.sendEventToPostHog(PostHogAction.SignMessageAskingForPassword);
      setShouldShowPasswordPrompt(true);
    } else {
      analytics.sendEventToPostHog(PostHogAction.SignMessageAskingHardwareWalletInteraction);
      performSigning(selectedAddress, message, passwordRef.current);
    }
  }, [isHardwareWallet, analytics, performSigning, selectedAddress, message]);

  const handleCopy = useCallback(() => {
    toast.notify({
      text: t('general.clipboard.copiedToClipboard'),
      withProgressBar: true
    });
    analytics.sendEventToPostHog(PostHogAction.SignMessageCopySignatureClick);
  }, [analytics, t]);

  const goBack = useCallback(() => {
    clearSecrets();
    setShouldShowPasswordPrompt(false);
    setShowHardwareSigningError(false);
    resetSigningState();
  }, [clearSecrets, resetSigningState]);

  const signAnotherMessage = useCallback(() => {
    setMessage('');
    setSelectedAddress('');
    goBack();
  }, [goBack]);

  useDrawerConfiguration({
    selectedAddress,
    message,
    isSigningInProgress,
    isHardwareWallet,
    error,
    handleSign,
    clearSecrets,
    signatureObject,
    goBack,
    signAnotherMessage
  });

  const renderInitialState = () => (
    <>
      <Text.Body.Large weight="$bold" data-testid={'drawer-header-title'}>
        {t('core.signMessage.instructions')}
      </Text.Body.Large>
      <Text.Body.Normal className={styles.subtitle} data-testid={'drawer-header-subtitle'}>
        {t('core.signMessage.subtitle')}
      </Text.Body.Normal>
      {isHardwareWallet && hardwareWalletError && (
        <div className={styles.errorMessage}>
          <Text.Body.Normal color="error">{hardwareWalletError}</Text.Body.Normal>
        </div>
      )}
      <div className={styles.inputGroup}>
        <Text.Body.Normal weight="$medium" data-testid={'address-label'}>
          {t('core.signMessage.addressLabel')}
        </Text.Body.Normal>
        <WalletOwnAddressDropdown
          addresses={usedAddresses}
          onSelect={setSelectedAddress}
          placeholder={selectedAddress ? shortenWalletOwnAddress(selectedAddress) : t('core.signMessage.selectAddress')}
        />
      </div>
      <div className={styles.inputGroup}>
        <Text.Body.Normal weight="$medium" data-testid={'message-to-sign-label'}>
          {t('core.signMessage.messageLabel')}
        </Text.Body.Normal>
        <TextArea
          placeholder={t('core.signMessage.messagePlaceholder')}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          dataTestId="sign-message"
          rows={4}
          className={styles.customTextArea}
        />
      </div>
    </>
  );

  const renderPasswordPrompt = () => (
    <>
      <Text.Body.Large weight="$bold" data-testid={'drawer-header-title'}>
        {t('core.signMessage.passwordTitle')}
      </Text.Body.Large>
      <Text.Body.Normal className={styles.subtitle} data-testid={'drawer-header-subtitle'}>
        {t('core.signMessage.passwordSubtitle')}
      </Text.Body.Normal>
      <PasswordInput
        onChange={setPassword}
        label={t('core.signMessage.passwordLabel')}
        dataTestId="password-input"
        error={!!error}
        errorMessage={error}
        wrapperClassName={styles.passwordWrapper}
        id={inputId}
      />
    </>
  );

  const renderSignature = () => (
    <div className={styles.inputGroup}>
      <ResultMessage customBgImg={CheckSuccessImg} title={t('core.signMessage.successTitle')} />
      <div className={styles.inputGroup}>
        <Flex justifyContent="space-between" alignItems="center">
          <Text.Body.Normal weight="$medium" data-testid={'result-message-signature-label'}>
            {t('core.signMessage.signature')}
          </Text.Body.Normal>
          {renderCopyToClipboard({
            text: signatureObject.signature,
            handleCopy,
            t,
            testId: 'signature-copy-to-clipboard-button'
          })}
        </Flex>

        <TextArea
          value={signatureObject.signature}
          dataTestId="sign-message-signature"
          rows={4}
          className={styles.customTextArea}
        />
      </div>
      <div className={styles.inputGroup}>
        <Flex justifyContent="space-between" alignItems="center">
          <Text.Body.Normal weight="$medium" data-testid={'result-message-key-label'}>
            {t('core.signMessage.key')}
          </Text.Body.Normal>
          {renderCopyToClipboard({
            text: signatureObject.key,
            handleCopy,
            t,
            testId: 'public-key-copy-to-clipboard-button'
          })}
        </Flex>
        <TextArea
          value={signatureObject.key}
          dataTestId="sign-message-key"
          rows={4}
          className={styles.customTextArea}
        />
      </div>
    </div>
  );

  const renderHardwareSigningError = () => (
    <Flex
      flexDirection="column"
      alignItems="center"
      gap="$16"
      justifyContent="center"
      className={styles.hardwareErrorContainer}
    >
      <ResultMessage
        fullWidth
        status="error"
        title={
          <div data-testid="sign-message-error-title">{t('browserView.transaction.fail.oopsSomethingWentWrong')}</div>
        }
        description={
          <>
            <div data-testid="sign-message-error-description">
              {t('browserView.transaction.fail.problemSubmittingYourTransaction')}
            </div>
            <div data-testid="sign-message-error-description2" className={styles.message}>
              {t('browserView.transaction.fail.clickBackAndTryAgain')}
            </div>
            {typeof errorObj === 'object' && errorObj.message && (
              <Box w="$fill">
                <SummaryExpander
                  onClick={() => setIsSummaryOpen(!isSummaryOpen)}
                  open={isSummaryOpen}
                  title={t('browserView.transaction.fail.error-details.label')}
                  plain
                >
                  <TransactionSummary.Other
                    label={errorObj.name || t('browserView.transaction.fail.error-details.error-name-fallback')}
                    text={errorObj.message}
                  />
                </SummaryExpander>
              </Box>
            )}
          </>
        }
      />
    </Flex>
  );

  useAutoFocus(inputId, shouldShowPasswordPrompt);

  const renderContent = () => {
    if (isSigningInProgress) {
      return <MainLoader />;
    }

    if (signatureObject) {
      return renderSignature();
    }

    if (shouldShowPasswordPrompt) {
      return renderPasswordPrompt();
    }

    if (showHardwareSigningError) {
      return renderHardwareSigningError();
    }

    return renderInitialState();
  };

  return (
    <div data-testid="sign-message" className={styles.container}>
      {renderContent()}
    </div>
  );
};
