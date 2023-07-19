import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EditAddressForm, EditAddressFormFooter } from '@lace/core';
import { withAddressBookContext, useAddressBookContext } from '@src/features/address-book/context';
import { useAddressBookStore } from '@src/features/address-book/store';
import { AddressBookSchema } from '@src/lib/storage';
import { useSections } from '../store';
import { CancelEditAddressModal } from './CancelEditAddressModal';
import AddIcon from '../../../../../assets/icons/add.component.svg';
import EditIcon from '../../../../../assets/icons/edit.component.svg';
import {
  getAddressToSave,
  validateWalletAddress,
  validateWalletHandle,
  validateWalletName
} from '@src/utils/validators';
import { useHandleResolver } from '@hooks/useHandleResolver';
import { Form } from 'antd';

interface AddressFormProps {
  isPopupView?: boolean;
}

export const AddressForm = withAddressBookContext(({ isPopupView }: AddressFormProps): React.ReactElement => {
  const { t } = useTranslation();
  const [isConfirmCancelVisible, setIsConfirmCancelVisible] = useState<boolean>(false);
  const { setPrevSection } = useSections();

  const { addressToEdit, setAddressToEdit } = useAddressBookStore();
  const { utils } = useAddressBookContext();
  const { saveRecord: saveAddress, updateRecord: updateAddress } = utils;
  const [form] = Form.useForm<{ name: string; address: string }>();

  const handleResolver = useHandleResolver();

  const validations = useMemo(
    () => ({
      name: validateWalletName,
      address: validateWalletAddress,
      handle: async (value: string) => await validateWalletHandle({ value, handleResolver })
    }),
    [handleResolver]
  );

  const editAddressFormTranslations = {
    walletName: t('core.editAddressForm.walletName'),
    address: t('core.editAddressForm.address')
  };

  const onAddressSave = async (address: AddressBookSchema): Promise<string> => {
    const addressToSave = await getAddressToSave(address, handleResolver);

    return 'id' in addressToEdit
      ? updateAddress(addressToEdit.id, addressToSave, {
          text: t('browserView.addressBook.toast.editAddress'),
          icon: EditIcon
        })
      : saveAddress(addressToSave, {
          text: t('browserView.addressBook.toast.addAddress'),
          icon: AddIcon
        });
  };

  const onConfirmClick = (address: AddressBookSchema) => {
    onAddressSave(address);
  };

  const onCancelClick = () => {
    setIsConfirmCancelVisible(true);
  };

  return (
    <>
      {
        <EditAddressForm
          {...{
            initialValues: addressToEdit,
            validations
          }}
          form={form}
          footer={
            <EditAddressFormFooter
              form={form}
              onConfirmClick={onConfirmClick}
              onCancelClick={onCancelClick}
              onClose={setPrevSection}
            />
          }
          validations={validations}
          translations={editAddressFormTranslations}
        />
      }
      <CancelEditAddressModal
        visible={isConfirmCancelVisible}
        onCancel={() => {
          setIsConfirmCancelVisible(false);
        }}
        onConfirm={() => {
          setIsConfirmCancelVisible(false);
          setAddressToEdit({} as AddressBookSchema);
          setPrevSection();
        }}
        isPopupView={isPopupView}
      />
    </>
  );
});
