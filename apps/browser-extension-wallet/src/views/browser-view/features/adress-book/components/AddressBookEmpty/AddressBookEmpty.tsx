import React from 'react';
import { Image } from 'antd';
import { useTranslation } from 'react-i18next';
import Empty from '@assets/icons/empty.svg';
import styles from './AddressBookEmpty.module.scss';

export type AddressBookEmptyProps = {
  subtitle?: string | React.ReactElement;
};

export const AddressBookEmpty = ({ subtitle }: AddressBookEmptyProps): React.ReactElement => {
  const { t: translate } = useTranslation();

  return (
    <div data-testid="address-book-empty" className={styles.container}>
      <Image data-testid="address-book-empty-state-image" preview={false} src={Empty} />
      <h2 data-testid="address-book-empty-state-title" className={styles.title}>
        {translate('browserView.addressBook.emptyState.title')}
      </h2>
      <div data-testid="address-book-empty-state-message" className={styles.subtitle}>
        {subtitle || translate('browserView.addressBook.emptyState.message')}
      </div>
    </div>
  );
};
