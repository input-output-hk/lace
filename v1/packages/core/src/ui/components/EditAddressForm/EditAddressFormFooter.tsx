import React, { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, toast } from '@lace/common';
import { Form, FormInstance } from 'antd';
import styles from './EditAddressForm.module.scss';
import { addressKey, keys, nameKey } from '@src/ui/utils';
import { ReactComponent as ErrorIcon } from '../../assets/icons/address-error-icon.component.svg';

type valuesPropType = {
  id?: number;
  name?: string;
  address?: string;
};

export type EditAddressFormFooterProps = {
  form: FormInstance;
  isNewAddress?: boolean;
  onConfirmClick: (values: valuesPropType) => void;
  onCancelClick: (event?: React.MouseEvent<HTMLButtonElement>) => void;
  onClose?: () => void;
};

export const EditAddressFormFooter = ({
  form,
  isNewAddress,
  onConfirmClick,
  onCancelClick,
  onClose
}: EditAddressFormFooterProps): ReactElement => {
  const { t } = useTranslation();
  const nameValue = Form.useWatch(nameKey, form);
  const addressValue = Form.useWatch(addressKey, form);

  const onSubmit = async () => {
    try {
      await onConfirmClick({ name: nameValue, address: addressValue });
      if (onClose) onClose();
    } catch {
      // TODO: add nicer way to handle errors - LW-7233
      toast.notify({ text: t('core.editAddressForm.submissionError'), icon: ErrorIcon });
    }
  };

  return (
    <div className={styles.footer} data-testid="address-form-buttons">
      <Form.Item shouldUpdate className={styles.submitBtn}>
        {() => {
          const hasErrors = form.getFieldsError(keys).some(({ errors }) => errors?.length);
          const isValidating = form.isFieldsValidating(keys);
          const isTouched = form.isFieldsTouched(keys, isNewAddress);
          const isFormValid = !hasErrors && !isValidating && isTouched;

          return (
            <Button block disabled={!isFormValid} onClick={onSubmit} data-testid="address-form-button-save">
              {isNewAddress ? t('core.addressForm.doneButton') : t('core.editAddressForm.doneButton')}
            </Button>
          );
        }}
      </Form.Item>
      <Button block color="secondary" onClick={onCancelClick} data-testid="address-form-button-cancel">
        {t('core.general.cancelButton')}
      </Button>
    </div>
  );
};
