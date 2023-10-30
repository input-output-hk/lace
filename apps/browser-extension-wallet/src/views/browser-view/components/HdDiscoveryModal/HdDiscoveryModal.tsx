import React from 'react';
import { WarningModal } from '@views/browser/components';
import styles from '@components/MainLoader/MainLoader.module.scss';
import { Loader } from '@lace/common';
import { useTranslation } from 'react-i18next';

export type HdDiscoveryModalProps = {
  visible: boolean;
};

export const HdDiscoveryModal = ({ visible }: HdDiscoveryModalProps) => {
  const { t } = useTranslation();
  return (
    <WarningModal
      header={t('hdDiscovery.modal.title')}
      content={<Loader className={styles.loader} data-testid="hd-discovery-loader" />}
      visible={visible}
      withCancel={false}
      withConfirm={false}
    />
  );
};
