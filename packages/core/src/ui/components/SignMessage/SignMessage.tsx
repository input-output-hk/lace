import React from 'react';
import styles from './SignMessage.module.scss';
import cn from 'classnames';
import { useTranslation } from 'react-i18next';
import { WalletOwnAddressDropdown, AddressSchema } from '../WalletOwnAddressesDropdown';
import { Drawer, DrawerNavigation } from '@lace/common';

export type SignMessageProps = {
  addresses: AddressSchema[];
  onClose: () => void;
};

export const SignMessage = ({ addresses, onClose }: SignMessageProps): React.ReactElement => {
  const { t } = useTranslation();
  const customHeaderTitle = (
    <div className={styles.draweHeaderTitle}>
      <h1 className={styles.title}>{t('core.signMessage.title')}</h1>
      <h4 className={styles.subtitle}>{t('core.signMessage.subtitle')}</h4>
    </div>
  );
  return (
    <div className={cn(styles.wrapper)}>
      <Drawer
        visible
        onClose={() => onClose()}
        title={customHeaderTitle}
        navigation={
          <DrawerNavigation
            title={t('core.signMessage.heading')}
            onCloseIconClick={onClose}
            onArrowIconClick={onClose}
          />
        }
      >
        <div className={styles.infoContainer}>
          <WalletOwnAddressDropdown items={addresses} />
        </div>
      </Drawer>
    </div>
  );
};
