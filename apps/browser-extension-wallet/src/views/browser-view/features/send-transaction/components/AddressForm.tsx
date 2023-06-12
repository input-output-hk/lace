import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EditAddressForm, ValidationOptionsProps, FormKeys, valuesPropType } from '@lace/core';
import { withAddressBookContext, useAddressBookContext } from '@src/features/address-book/context';
import { validateWalletName, validateWalletAddress } from '@src/utils/validators/address-book';
import { useAddressBookStore } from '@src/features/address-book/store';
import { AddressBookSchema } from '@src/lib/storage';
import { useSections } from '../store';
import { CancelEditAddressModal } from './CancelEditAddressModal';
import AddIcon from '../../../../../assets/icons/add.component.svg';
import EditIcon from '../../../../../assets/icons/edit.component.svg';
import EditAddressFormFooter from '@src/features/address-book/components/AddressDetailDrawer/EditAddressFormFooter';
import { addNetworkToAddressBook } from '@views/browser/features/adress-book';
import { EnvironmentTypes, useWalletStore } from '@stores';

const validations: ValidationOptionsProps<FormKeys> = {
  name: validateWalletName,
  address: validateWalletAddress
};

interface AddressFormProps {
  isPopupView?: boolean;
}

export const AddressForm = withAddressBookContext(({ isPopupView }: AddressFormProps): React.ReactElement => {
  const { t } = useTranslation();
  const [isConfirmCancelVisible, setIsConfirmCancelVisible] = useState<boolean>(false);
  const { setPrevSection } = useSections();
  const { environmentName } = useWalletStore();

  const { addressToEdit, setAddressToEdit } = useAddressBookStore();
  const { utils } = useAddressBookContext();
  const { saveRecord: saveAddress, updateRecord: updateAddress } = utils;
  const [formValues, setFormValues] = useState<valuesPropType>(addressToEdit);

  const editAddressFormTranslations = {
    walletName: t('core.editAddressForm.walletName'),
    address: t('core.editAddressForm.address')
  };

  const getFieldError = (key: FormKeys) => validations[key]?.(formValues[key]);

  const onAddressSave = (address: AddressBookSchema): Promise<string> =>
    'id' in addressToEdit
      ? updateAddress(
          addressToEdit.id,
          addNetworkToAddressBook(address, environmentName.toUpperCase() as Uppercase<EnvironmentTypes>),
          {
            text: t('browserView.addressBook.toast.editAddress'),
            icon: EditIcon
          }
        )
      : saveAddress(addNetworkToAddressBook(address, environmentName.toUpperCase() as Uppercase<EnvironmentTypes>), {
          text: t('browserView.addressBook.toast.addAddress'),
          icon: AddIcon
        });

  const onConfirmClick = (address: AddressBookSchema) => {
    onAddressSave(address);
  };

  const onCancelClick = () => {
    setIsConfirmCancelVisible(true);
  };

  return (
    <>
      <EditAddressForm
        {...{
          initialValues: formValues,
          validations,
          setFormValues,
          getFieldError,
          footer: (
            <EditAddressFormFooter
              formValues={formValues}
              getFieldError={getFieldError}
              onCancelClick={onCancelClick}
              onConfirmClick={onConfirmClick}
              validations={validations}
              onClose={setPrevSection}
            />
          )
        }}
        translations={editAddressFormTranslations}
      />
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
