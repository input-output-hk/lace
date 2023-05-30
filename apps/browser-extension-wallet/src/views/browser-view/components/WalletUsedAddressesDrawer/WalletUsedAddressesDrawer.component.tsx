import React from 'react';
import { WalletUsedAddressList } from '@lace/core';
import { DrawerHeader, DrawerNavigation } from '@lace/common';
import styles from './WalletUsedAddressesDrawer.module.scss';
import { useTranslation } from 'react-i18next';

export interface UsedAddressesSchema {
  id: number;
  address: string;
}

export interface Props {
  usedAddresses: UsedAddressesSchema[];
  onCloseClick: () => void;
}

export const WalletUsedAddressesDrawer = ({ usedAddresses = [], onCloseClick }: Props): React.ReactElement => {
  const { t } = useTranslation();

  const customHeaderTitle = (
    <div className={styles.draweHeaderTitle}>
      <h1 className={styles.title}>
        {t('core.receive.usedAddresses.title', {
          count: usedAddresses.length
        })}
      </h1>
      <h4 className={styles.subtitle}>{t('core.receive.usedAddresses.subtitle')}</h4>
    </div>
  );

  return (
    <>
      <DrawerNavigation onCloseIconClick={() => onCloseClick()} />
      <DrawerHeader title={customHeaderTitle} />
      <div className={styles.infoContainer}>
        <WalletUsedAddressList
          translations={{
            copy: t('core.receive.usedAddresses.copy'),
            addressCopied: t('core.receive.usedAddresses.addressCopied')
          }}
          items={usedAddresses}
        />
      </div>
    </>
  );
};
