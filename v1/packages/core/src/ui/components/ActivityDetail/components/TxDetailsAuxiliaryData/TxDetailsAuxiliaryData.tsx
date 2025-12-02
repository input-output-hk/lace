import React, { useCallback } from 'react';
import { TxDetailsGroup } from '../../TxDetailsGroup';
import { useTranslation } from 'react-i18next';
import { Flex, Text } from '@input-output-hk/lace-ui-toolkit';
import { ReactComponent as CopyIcon } from '../../../../assets/icons/copy-icon.svg';
import styles from './TxDetailsAuxiliaryData.module.scss';
import CopyToClipboard from 'react-copy-to-clipboard';
import { toast } from '@lace/common';
import { Wallet } from '@lace/cardano';

/* eslint-disable @typescript-eslint/no-explicit-any */
const jsonReplacer = (_key: any, value: any) => {
  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (value instanceof Uint8Array) {
    return [...value];
  }

  return value;
};

interface TxDetailsAuxDataProps {
  auxiliaryData: Wallet.Cardano.AuxiliaryData;
}

const JSON_STRINGIFY_INDENT = 2;

export const TxDetailsAuxiliaryData = ({ auxiliaryData }: TxDetailsAuxDataProps): React.ReactElement | null => {
  const { t } = useTranslation();

  const doToast = useCallback(() => {
    toast.notify({
      text: t('core.addressCard.handle.copy.notification'),
      icon: CopyIcon
    });
  }, [t]);

  // Currently this only renders metadata, so if there's no blob, render nothing
  if (!auxiliaryData?.blob) {
    /* eslint-disable-next-line unicorn/no-null */
    return null;
  }

  const metadatumAsString = JSON.stringify(
    Wallet.metadatum.metadatumToJson(auxiliaryData.blob),
    jsonReplacer,
    JSON_STRINGIFY_INDENT
  );

  return (
    <TxDetailsGroup title={t('core.activityDetails.auxData')} testId="auxData-detail" withSeparatorLine>
      <Flex flexDirection="column" gap="$20">
        <Flex w="$fill" justifyContent="flex-end">
          <CopyToClipboard text={metadatumAsString}>
            <CopyIcon className={styles.copyButton} data-testid="copy-auxData-btn" onClick={doToast} />
          </CopyToClipboard>
        </Flex>
        <pre className={styles.metadata} data-testid="metadata-value">
          {metadatumAsString}
        </pre>
        <Text.Body.Normal data-testid="auxData-value" className={styles.auxData} weight="$medium" />
      </Flex>
    </TxDetailsGroup>
  );
};
