import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from 'antd';
import styles from './Footer.module.scss';

import { withAddressBookContext } from '@src/features/address-book/context';
import { AddressBookSchema } from '@lib/storage';
import { useAddressBookStore } from '@src/features/address-book/store';

import { useSections } from '../../store';
import { useOnAddressSave } from '@hooks';

export const AddressFormFooter = withAddressBookContext(() => {
  const { t } = useTranslation();
  const { addressToEdit, setAddressToEdit } = useAddressBookStore();
  const { setPrevSection } = useSections();
  const { onSaveAddressActions } = useOnAddressSave();

  const onAddressSave = (address: Omit<AddressBookSchema, 'id' | 'network'>) =>
    onSaveAddressActions(address, addressToEdit);

  const onFormSubmit = async () => {
    try {
      await onAddressSave({ address: addressToEdit.address, name: addressToEdit.name });
      setAddressToEdit({ address: '', name: '' });
      if (setPrevSection) setPrevSection();
    } catch {
      // TODO: handle error
    }
  };

  return (
    <div className={styles.footer}>
      <Button
        size="large"
        block
        className={styles.nextStep}
        disabled={!addressToEdit.name || !addressToEdit.address}
        onClick={() => onFormSubmit()}
      >
        {t('browserView.transaction.send.footer.save')}
      </Button>
      <Button size="large" block className={styles.cancel} onClick={() => setPrevSection()}>
        {t('browserView.transaction.send.footer.cancel')}
      </Button>
    </div>
  );
});
