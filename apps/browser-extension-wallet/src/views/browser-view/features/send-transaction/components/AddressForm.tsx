import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EditAddressForm, EditAddressFormFooter } from '@lace/core';
import { withAddressBookContext } from '@src/features/address-book/context';
import { useAddressBookStore } from '@src/features/address-book/store';
import { AddressBookSchema } from '@src/lib/storage';
import { useSections } from '../store';
import { CancelEditAddressModal } from './CancelEditAddressModal';
import { validateWalletAddress, validateWalletHandle, validateWalletName } from '@src/utils/validators';
import { useHandleResolver } from '@hooks/useHandleResolver';
import { Form } from 'antd';
import { useOnAddressSave } from '@hooks';

interface AddressFormProps {
  isPopupView?: boolean;
}

export const AddressForm = withAddressBookContext(({ isPopupView }: AddressFormProps): React.ReactElement => {
  const { t } = useTranslation();
  const [isConfirmCancelVisible, setIsConfirmCancelVisible] = useState<boolean>(false);
  const { setPrevSection } = useSections();
  const { onSaveAddressActions } = useOnAddressSave();
  const { addressToEdit, setAddressToEdit } = useAddressBookStore();
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

  const onAddressSave = (address: AddressBookSchema) => onSaveAddressActions(address, addressToEdit);

  const onConfirmClick = async (address: AddressBookSchema) => {
    await onAddressSave(address);
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
