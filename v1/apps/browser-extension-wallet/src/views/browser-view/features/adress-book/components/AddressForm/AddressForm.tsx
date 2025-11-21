import React, { useMemo } from 'react';
import { AddressFormBrowserView, valuesPropType } from '@lace/core';
import { validateWalletName, validateWalletHandle, validateWalletAddress } from '@src/utils/validators/address-book';
import { useTranslation } from 'react-i18next';
import { useHandleResolver } from '@hooks/useHandleResolver';

type InitialValuesProps = {
  address?: string;
  id?: number;
  name?: string;
};

export type AddressFormProps = {
  initialValues: InitialValuesProps;
  onConfirmClick: (values: valuesPropType) => unknown;
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

  const handleResolver = useHandleResolver();

  const validations = useMemo(
    () => ({
      name: validateWalletName,
      address: validateWalletAddress,
      handle: async (value: string) => await validateWalletHandle({ value, handleResolver })
    }),
    [handleResolver]
  );

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
