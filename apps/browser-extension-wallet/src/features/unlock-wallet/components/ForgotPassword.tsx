import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Typography } from 'antd';
import { Button } from '@lace/common';
import { HW_POPUPS_WIDTH } from '@src/utils/constants';
import styles from './ForgotPassword.module.scss';

const { Title, Text } = Typography;

export interface UnlockWalletProps {
  onForgotPasswordClick: () => void;
}

export const ForgotPassword = ({ onForgotPasswordClick }: UnlockWalletProps): React.ReactElement => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const { t } = useTranslation();

  return (
    <>
      <div className={styles.linkButton} onClick={() => setIsModalVisible(true)} data-testid="forgot-password-link">
        {t('unlock.forgotPassword')}
      </div>
      <Modal
        centered
        closable={false}
        // eslint-disable-next-line unicorn/no-null
        footer={null}
        open={isModalVisible}
        width={HW_POPUPS_WIDTH}
        className={styles.modal}
      >
        <Title level={3} className={styles.title} data-testid="forgot-password-title">
          {t('forgotPassword.title')}
        </Title>
        <Text className={styles.description} data-testid="forgot-password-description">
          {' '}
          {t('forgotPassword.description')}
        </Text>
        <div className={styles.buttons}>
          <Button
            className={styles.button}
            onClick={onForgotPasswordClick}
            block
            data-testid="forgot-password-confirm-button"
          >
            {t('forgotPassword.confirm')}
          </Button>
          <Button
            className={styles.button}
            onClick={() => setIsModalVisible(false)}
            color="secondary"
            data-testid="forgot-password-cancel-button"
          >
            {t('forgotPassword.cancel')}
          </Button>
        </div>
      </Modal>
    </>
  );
};
