import React, { ReactElement } from 'react';
import styles from '@src/features/address-book/components/AddressDetailDrawer/AddressDetailDrawer.module.scss';
import { Button } from '@lace/common';
import { FormKeys, ValidationOptionsProps, valuesPropType } from '@lace/core';
import { useTranslation } from 'react-i18next';

interface EditAddressFormFooterProps {
  validations: ValidationOptionsProps<FormKeys>;
  formValues: valuesPropType;
  isNewAddress?: boolean;
  onCancelClick: (event?: React.MouseEvent<HTMLButtonElement>) => unknown;
  onConfirmClick: (values: valuesPropType) => unknown;
  onClose?: () => void;
  getFieldError: (keys: FormKeys) => string;
  currentName?: string;
}

const EditAddressFormFooter = ({
  validations,
  formValues,
  isNewAddress,
  onConfirmClick,
  onCancelClick,
  onClose,
  getFieldError
}: EditAddressFormFooterProps): ReactElement => {
  const { t } = useTranslation();

  const isFormValid = () => {
    const formKeys: Array<FormKeys> = Object.keys(validations) as FormKeys[];
    return !formKeys.some((key) => !!getFieldError(key));
  };

  const onSubmitAddress = async () => {
    if (isFormValid()) {
      try {
        await onConfirmClick(formValues);
        if (onClose) onClose();
      } catch {
        // TODO: add nicer way to handle errors, console messega removed by QA request
      }
    }
  };

  return (
    <div className={styles.footer} data-testid="address-form-buttons">
      <Button block disabled={!isFormValid()} onClick={onSubmitAddress} data-testid="address-form-button-save">
        {isNewAddress ? t('browserView.addressBook.addressForm.saveAddress') : t('core.editAddressForm.doneButton')}
      </Button>
      <Button block color="secondary" onClick={onCancelClick} data-testid="address-form-button-cancel">
        {t('core.general.cancelButton')}
      </Button>
    </div>
  );
};

export default EditAddressFormFooter;
