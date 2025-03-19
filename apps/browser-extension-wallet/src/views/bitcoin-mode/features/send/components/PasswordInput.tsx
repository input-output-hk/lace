import React, { useCallback, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import styles from './SendFlow.module.scss';
import { Password, PasswordObj, useSecrets } from '@lace/core';
import { Button, useAutoFocus } from '@lace/common';
import { Box, Flex, Text } from '@input-output-hk/lace-ui-toolkit';
import { BitcoinWallet } from '@lace/bitcoin';
import { createPassphrase } from '@lib/wallet-api-ui';
import { useTranslation } from 'react-i18next';
import { useDrawer } from '@src/views/browser-view/stores';

const inputId = `id-${uuidv4()}`;

interface PasswordInputProps {
  signTransaction: (password: Buffer) => Promise<BitcoinWallet.SignedTransaction> | undefined;
  onSubmit: (signedTx: BitcoinWallet.SignedTransaction) => Promise<void>;
}

export const PasswordInput: React.FC<PasswordInputProps> = ({ onSubmit, signTransaction }) => {
  const [config, clearContent] = useDrawer();
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
        <Text.SubHeading weight="$bold">{t('browserView.transaction.send.confirmationTitle')}</Text.SubHeading>
        <Box mt="$4">
          <Text.Body.Normal color="secondary" weight="$medium">
            {t('browserView.staking.details.sign.subTitle')}
          </Text.Body.Normal>
        </Box>

        <Flex className={styles.container} w="$fill" alignItems="center" justifyContent="center">
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

      <Flex w="$fill" py="$24" px="$40" flexDirection="column" gap="$16" className={styles.buttons}>
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
        <Button
          color="secondary"
          block
          size="medium"
          onClick={() => (config?.onClose ? config?.onClose() : clearContent())}
          data-testid="back-button"
        >
          {t('browserView.transaction.send.footer.cancel')}
        </Button>
      </Flex>
    </Flex>
  );
};
