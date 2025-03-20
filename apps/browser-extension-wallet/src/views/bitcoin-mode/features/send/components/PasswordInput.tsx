import React, { useCallback, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import styles from './SendFlow.module.scss';
import { Password, PasswordObj, useSecrets } from '@lace/core';
import { Button, useAutoFocus } from '@lace/common';
import { Box, Flex, Text } from '@input-output-hk/lace-ui-toolkit';
import { Bitcoin } from '@lace/bitcoin';
import { createPassphrase } from '@lib/wallet-api-ui';
import { useTranslation } from 'react-i18next';

const inputId = `id-${uuidv4()}`;

interface PasswordInputProps {
  signTransaction: (password: Buffer) => Promise<Bitcoin.SignedTransaction> | undefined;
  onSubmit: (signedTx: Bitcoin.SignedTransaction) => Promise<void>;
  isPopupView: boolean;
  onClose: () => void;
}

export const PasswordInput: React.FC<PasswordInputProps> = ({ onSubmit, signTransaction, isPopupView, onClose }) => {
  const { t } = useTranslation();
  const { password, setPassword, clearSecrets } = useSecrets();
  const [validPassword, setValidPassword] = useState<boolean>();

  const handleConfirm = useCallback(
    async (spendingPassphrase: Partial<PasswordObj>) => {
      let signedTx;
      try {
        const passphrase = createPassphrase(spendingPassphrase);
        setValidPassword(true);
        signedTx = await signTransaction(passphrase);
      } catch {
        setValidPassword(false);
      }
      await onSubmit(signedTx);
      clearSecrets();
    },
    [clearSecrets, onSubmit, signTransaction]
  );

  const confirmIsDisabled = !password.value;

  const handleSubmit = useCallback(
    (event, passphrase) => {
      event.preventDefault();
      event.stopPropagation();

      if (!confirmIsDisabled) {
        handleConfirm(passphrase);
      }
    },
    [handleConfirm, confirmIsDisabled]
  );

  useAutoFocus(inputId, true);

  return (
    <Flex flexDirection="column" w="$fill" className={styles.container}>
      <Flex flexDirection="column" w="$fill" className={styles.container}>
        {isPopupView ? (
          <Text.Heading weight="$bold">{t('browserView.transaction.send.confirmationTitle')}</Text.Heading>
        ) : (
          <Text.SubHeading weight="$bold">{t('browserView.transaction.send.confirmationTitle')}</Text.SubHeading>
        )}

        <Box mt={isPopupView ? '$48' : '$4'}>
          <Text.Body.Normal color="secondary" weight="$medium">
            {t('browserView.staking.details.sign.subTitle')}
          </Text.Body.Normal>
        </Box>

        <Flex
          className={styles.container}
          w="$fill"
          alignItems={isPopupView ? 'flex-start' : 'center'}
          mt={isPopupView ? '$44' : undefined}
          justifyContent="center"
        >
          <Password
            id={inputId}
            onSubmit={(e) => handleSubmit(e, password)}
            onChange={setPassword}
            error={validPassword === false}
            errorMessage={t('general.errors.invalidPassword')}
            label={t('browserView.transaction.send.password.placeholder')}
            autoFocus
          />
        </Flex>
      </Flex>

      <Flex
        w="$fill"
        py="$24"
        pb={isPopupView ? '$0' : '$24'}
        px="$40"
        flexDirection="column"
        gap={isPopupView ? '$8' : '$16'}
        className={styles.buttons}
      >
        <Button
          disabled={confirmIsDisabled}
          color="primary"
          block
          size="medium"
          onClick={() => handleConfirm(password)}
          data-testid="continue-button"
        >
          {t('browserView.transaction.send.footer.confirm')}
        </Button>
        <Button color="secondary" block size="medium" onClick={onClose} data-testid="back-button">
          {t('browserView.transaction.send.footer.cancel')}
        </Button>
      </Flex>
    </Flex>
  );
};
