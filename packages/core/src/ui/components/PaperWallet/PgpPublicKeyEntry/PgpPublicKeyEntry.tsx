import React from 'react';
import { Flex, TextBox, Text, CheckComponent as CheckIcon } from '@input-output-hk/lace-ui-toolkit';
import { i18n } from '@lace/translation';
import { TextArea } from '@lace/common';
import styles from './PgpPublicKeyEntry.module.scss';

interface Props {
  handlePgpPublicKeyBlockChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => Promise<void>;
  handlePgpReferenceChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  validation: {
    error?: string;
    success?: string;
  };
}

export const PgpPublicKeyEntry = ({
  handlePgpPublicKeyBlockChange,
  handlePgpReferenceChange,
  validation
}: Props): JSX.Element => (
  <Flex gap="$16" alignItems="stretch" flexDirection="column" w="$fill" h="$fill">
    <TextBox
      label={i18n.t('core.paperWallet.securePaperWallet.pgpPublicKeyReference')}
      onChange={handlePgpReferenceChange}
      data-testid="pgp-public-key-reference"
      maxLength={30}
      w={'$fill'}
    />
    <div className={styles.textAreaContainer}>
      <TextArea
        label={i18n.t('core.paperWallet.securePaperWallet.pgpPublicKeyLabel')}
        onChange={handlePgpPublicKeyBlockChange}
        dataTestId="pgp-public-key-block"
        isResizable={false}
        className={styles.textArea}
        wrapperClassName={styles.wrapper}
      />
    </div>
    <Flex
      style={{
        height: 16,
        paddingLeft: 24,
        fill: 'green',
        stroke: '#2CB67D'
      }}
    >
      {validation.success && (
        <Flex gap="$4">
          <CheckIcon />
          <Text.Label color="secondary">{validation.success}</Text.Label>
        </Flex>
      )}
      {validation.error && <Text.Label color="error">{validation.error}</Text.Label>}
    </Flex>
  </Flex>
);
