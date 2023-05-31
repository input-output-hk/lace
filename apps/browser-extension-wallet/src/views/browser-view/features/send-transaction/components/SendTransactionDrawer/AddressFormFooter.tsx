import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from 'antd';
import styles from './Footer.module.scss';

import { useAddressBookContext, withAddressBookContext } from '@src/features/address-book/context';
import { AddressBookSchema } from '@lib/storage';
import { useAddressBookStore } from '@src/features/address-book/store';

import AddIcon from '../../../../../../assets/icons/add.component.svg';
import EditIcon from '../../../../../../assets/icons/edit.component.svg';
import { useSections } from '../../store';

export const AddressFormFooter = withAddressBookContext(() => {
  const { t } = useTranslation();
  const { utils } = useAddressBookContext();
  const { addressToEdit, setAddressToEdit } = useAddressBookStore();
  const { setPrevSection } = useSections();
  const { saveRecord: saveAddress, updateRecord: updateAddress } = utils;

  const onAddressSave = (address: Partial<AddressBookSchema>): Promise<string> =>
    'id' in addressToEdit
      ? updateAddress(addressToEdit.id, address, {
          text: t('browserView.addressBook.toast.editAddress'),
          icon: EditIcon
        })
      : saveAddress(address, {
          text: t('browserView.addressBook.toast.addAddress'),
          icon: AddIcon
        });

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
        Save
      </Button>
      <Button size="large" block className={styles.cancel} onClick={() => setPrevSection()}>
        {t('browserView.transaction.send.footer.cancel')}
      </Button>
    </div>
  );
});
