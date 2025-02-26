import React, { useCallback } from 'react';
import { TxDetailsGroup } from '../../TxDetailsGroup';
import { useTranslation } from 'react-i18next';
import { Flex, Text } from '@input-output-hk/lace-ui-toolkit';
import { ReactComponent as CopyIcon } from '../../../../assets/icons/copy-icon.svg';
import styles from './TxDetailsCBOR.module.scss';
import CopyToClipboard from 'react-copy-to-clipboard';
import { toast } from '@lace/common';

interface TxDetailsCBORProps {
  cbor: string;
}

export const TxDetailsCBOR = ({ cbor }: TxDetailsCBORProps): React.ReactElement => {
  const { t } = useTranslation();

  const doToast = useCallback(() => {
    toast.notify({
      text: t('core.addressCard.handle.copy.notification'),
      icon: CopyIcon
    });
  }, [t]);

  return (
    <TxDetailsGroup title={t('core.activityDetails.CBOR.header')} testId="cbor" withSeparatorLine>
      <Flex flexDirection="column" gap="$20">
        <Flex w="$fill" justifyContent="space-between">
          <Text.Body.Normal weight="$semibold">{t('core.activityDetails.CBOR.title')}</Text.Body.Normal>
          <CopyToClipboard text={cbor}>
            <CopyIcon className={styles.copyButton} data-testid="copy-address-btn" onClick={doToast} />
          </CopyToClipboard>
        </Flex>
        <Text.Body.Normal className={styles.cbor} weight="$medium">
          {cbor}
        </Text.Body.Normal>
      </Flex>
    </TxDetailsGroup>
  );
};
