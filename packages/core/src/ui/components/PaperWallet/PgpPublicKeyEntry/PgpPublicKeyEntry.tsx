import React from 'react';
import { Flex, TextBox, Text, CheckComponent as CheckIcon } from '@input-output-hk/lace-ui-toolkit';
import { i18n } from '@lace/translation';
import { TextArea } from '@lace/common';
import styles from './PgpPublicKeyEntry.module.scss';
import cn from 'classnames';
interface Props {
  handlePgpPublicKeyBlockChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => Promise<void>;
  handlePgpReferenceChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  validation: {
    error?: string;
    success?: string;
  };
  pgpInfo: {
    pgpPublicKey: string;
    pgpKeyReference?: string;
  };
  textareaWrapperClassName?: string;
}

export const PgpPublicKeyEntry = ({
  handlePgpPublicKeyBlockChange,
  handlePgpReferenceChange,
  validation,
  pgpInfo,
  textareaWrapperClassName
}: Props): JSX.Element => (
  <Flex gap="$16" alignItems="stretch" flexDirection="column" w="$fill" h="$fill">
    <TextBox
      label={i18n.t('core.paperWallet.securePaperWallet.pgpPublicKeyReference')}
      onChange={handlePgpReferenceChange}
      data-testid="pgp-public-key-reference"
      maxLength={30}
      w="$fill"
      value={pgpInfo.pgpKeyReference}
    />
    <TextArea
      label={i18n.t('core.paperWallet.securePaperWallet.pgpPublicKeyLabel')}
      onChange={handlePgpPublicKeyBlockChange}
      dataTestId="pgp-public-key-block"
      wrapperClassName={cn([styles.wrapper, textareaWrapperClassName])}
      className={cn([styles.textArea, textareaWrapperClassName])}
      value={pgpInfo.pgpPublicKey}
    />
    <Flex className={styles.validation}>
      {validation.success && (
        <Flex gap="$4">
          <CheckIcon className={styles.success} data-testid={'fingerprint-icon'} />
          <Text.Label color="secondary" data-testid={'fingerprint-text'}>
            {validation.success}
          </Text.Label>
        </Flex>
      )}
      {validation.error && (
        <Text.Label color="error" data-testid={'validation-error'}>
          {validation.error}
        </Text.Label>
      )}
    </Flex>
  </Flex>
);
