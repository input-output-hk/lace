import { TranslationKey } from '@lib/translations/types';
import React from 'react';
import { Modal, Typography } from 'antd';
import { Button } from '@lace/common';
import styles from './makeErrorDialog.module.scss';
import { useTranslation } from 'react-i18next';

const { Title, Text } = Typography;

type TranslationKeys = Record<'title' | 'description' | 'confirm', TranslationKey>;

export interface ErrorDialogProps<ErrorCode extends string> {
  visible: boolean;
  onRetry: () => void;
  errorCode?: ErrorCode;
}

export const makeErrorDialog =
  <ErrorCode extends string>(translationsMap: Record<ErrorCode, TranslationKeys>) =>
  ({ visible, onRetry, errorCode }: ErrorDialogProps<ErrorCode>): React.ReactElement => {
    const { t } = useTranslation();
    const errorTranslationKeys = translationsMap[errorCode];

    return (
      <Modal
        centered
        closable={false}
        // eslint-disable-next-line unicorn/no-null
        footer={null}
        open={visible}
        width={420}
        className={styles.errorDialog}
      >
        <Title className={styles.title} level={3}>
          {t(errorTranslationKeys.title)}
        </Title>
        <Text className={styles.description}>{t(errorTranslationKeys.description)}</Text>
        <Button onClick={onRetry} className={styles.retryButton} block>
          {t(errorTranslationKeys.confirm)}
        </Button>
      </Modal>
    );
  };
