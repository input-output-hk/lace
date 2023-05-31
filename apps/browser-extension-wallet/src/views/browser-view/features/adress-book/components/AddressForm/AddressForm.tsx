import React from 'react';
import { AddressFormBrowserView, valuesPropType, ValidationOptionsProps, FormKeys } from '@lace/core';
import { validateWalletName, validateWalletAddress } from '@src/utils/validators/address-book';
import { useTranslation } from 'react-i18next';

type InitialValuesProps = {
  address?: string;
  id?: number;
  name?: string;
};

export type AddressFormProps = {
  initialValues: InitialValuesProps;
  onConfirmClick: (values: valuesPropType) => unknown;
};

const validations: ValidationOptionsProps<FormKeys> = {
  name: validateWalletName,
  address: validateWalletAddress
};

export const AddressForm = ({ initialValues, onConfirmClick }: AddressFormProps): React.ReactElement => {
  const { t } = useTranslation();
  const translations = {
    addAddress: t('core.addressForm.addAddress'),
    name: t('core.addressForm.name'),
    address: t('core.addressForm.address'),
    addNew: t('core.addressForm.addNew'),
    addNewSubtitle: t('core.addressForm.addNewSubtitle')
  };

  return (
    <AddressFormBrowserView
      {...{
        initialValues,
        onConfirmClick,
        validations
      }}
      translations={translations}
    />
  );
};
