import React from 'react';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import Copy from '../../assets/icons/copy.component.svg';
import { Box, Flex, Text } from '@input-output-hk/lace-ui-toolkit';
import { Button, toast } from '@lace/common';
import styles from './TransactionHashBox.module.scss';
import { useTranslation } from 'react-i18next';

export interface TransactionHashBoxProps {
  hash: string;
}

export const TransactionHashBox = ({ hash }: TransactionHashBoxProps): React.ReactElement => {
  const { t } = useTranslation();

  const handleCopy = () => {
    toast.notify({
      text: t('general.clipboard.copiedToClipboard')
    });
  };

  return (
    <Flex w="$fill" alignItems="center" flexDirection="column" gap="$12">
      <Box w="$fill" className={styles.transactionHashBox}>
        <Text.Body.Normal weight="$medium">{hash}</Text.Body.Normal>
      </Box>
      <CopyToClipboard onCopy={handleCopy} text={hash}>
        <Button className={styles.button} color="secondary" size="medium" data-testid="back-button">
          <Flex alignItems="center" justifyContent="center" gap="$4">
            <Copy className={styles.icon} />
            <Text.Button weight="$semibold">Copy</Text.Button>
          </Flex>
        </Button>
      </CopyToClipboard>
    </Flex>
  );
};
