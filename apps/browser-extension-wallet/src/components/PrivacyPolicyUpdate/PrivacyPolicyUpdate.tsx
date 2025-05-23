import React from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Modal, Typography } from 'antd';
import { Button } from '@lace/common';
import styles from './PrivacyPolicyUpdate.module.scss';
import { useLocalStorage } from '@hooks';
import { useExternalLinkOpener } from '@providers';

const { Title, Text } = Typography;

export const PrivacyPolicyUpdate = (): React.ReactElement => {
  const { t } = useTranslation();

  const openExternalLink = useExternalLinkOpener();
  const [acknowledgedPPUpdate, { updateLocalStorage: setDoesUserAcknowledgePPUdate }] = useLocalStorage(
    'hasUserAcknowledgedPrivacyPolicyUpdate',
    false
  );

  return (
    <Modal
      centered
      closable={false}
      // eslint-disable-next-line unicorn/no-null
      footer={null}
      open={!acknowledgedPPUpdate}
      width="100%"
      className={styles.modal}
    >
      <div data-testid="privacy-policy-update-banner-container" className={styles.container}>
        <div className={styles.content}>
          <Title level={3}>
            <span className={styles.title}>{t('privacyPolicyUpdate.title.text')}</span>
          </Title>
          <Text className={styles.description}>
            <Trans
              components={{
                a: (
                  <a
                    className={styles.legalButton}
                    onClick={() => openExternalLink(process.env.PRIVACY_POLICY_URL)}
                    data-testid="know-more-link"
                  />
                )
              }}
              i18nKey="privacyPolicyUpdate.description.text"
            />
          </Text>
        </div>
      </div>
      <Button
        data-testid="privacy-policy-update-accept-button"
        className={styles.button}
        onClick={() => setDoesUserAcknowledgePPUdate(true)}
        block
      >
        {t('privacyPolicyUpdate.cta')}
      </Button>
    </Modal>
  );
};
