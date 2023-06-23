/* eslint-disable react/no-multi-comp */
/* eslint-disable no-magic-numbers */
/* eslint-disable consistent-return */
import React, { ReactElement, useMemo } from 'react';
import cn from 'classnames';
import { Form, FormInstance } from 'antd';
import { Input, Button, Search } from '@lace/common';
import styles from './EditAddressForm.module.scss';
import { TranslationsFor } from '@ui/utils/types';
import debounce from 'debounce-promise';
import { isHandle } from '@src/ui/utils';
import { useTranslation } from 'react-i18next';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';

type valuesPropType = {
  id?: number;
  name?: string;
  address?: string;
};

const keys = ['name', 'address'];

type ValidatorFn = (_rule: any, value: string) => Promise<void>;
type ResolveAddressValidatorFn = (_rule: any, value: string, handleResolver: any) => Promise<void>;

export type EditAddressFormFooterProps = {
  form: FormInstance;
  isNewAddress?: boolean;
  onConfirmClick: (values: valuesPropType) => void;
  onCancelClick: (event?: React.MouseEvent<HTMLButtonElement>) => void;
  onClose?: () => void;
};

export type EditAddressFormProps = {
  form: FormInstance;
  initialValues: valuesPropType;
  validations: any;
  translations: TranslationsFor<'walletName' | 'address'>;
  footer?: React.ReactNode;
};

export const EditAddressFormFooter = ({
  form,
  isNewAddress,
  onConfirmClick,
  onCancelClick,
  onClose
}: EditAddressFormFooterProps) => {
  const { t } = useTranslation();
  const nameValue = Form.useWatch('name', form);
  const addressValue = Form.useWatch('address', form);

  const onSubmit = async () => {
    try {
      await onConfirmClick({ name: nameValue, address: addressValue });
      if (onClose) onClose();
    } catch {
      // TODO: add nicer way to handle errors, console messega removed by QA request
    } finally {
      form.resetFields();
    }
  };

  return (
    <div className={styles.footer} data-testid="address-form-buttons">
      <Form.Item shouldUpdate className={styles.submitBtn}>
        {() => {
          const hasErrors = form.getFieldsError(keys).some(({ errors }) => errors?.length);
          const isValidating = form.isFieldsValidating(keys);
          const isTouched = form.isFieldsTouched(keys, false);
          const isFormValid = !hasErrors && !isValidating && isTouched;

          return (
            <Button block disabled={!isFormValid} onClick={onSubmit} data-testid="address-form-button-save">
              {isNewAddress
                ? t('browserView.addressBook.addressForm.saveAddress')
                : t('core.editAddressForm.doneButton')}
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getValidator =
  (validate: (val: any) => string): ValidatorFn =>
  (_rule: any, value: string) => {
    const res = validate(value);
    return !res ? Promise.resolve() : Promise.reject(res);
  };

const getValidatorWithResolver = (
  validate: (val: string, handleResolver: any) => Promise<string>
): ResolveAddressValidatorFn => {
  const debouncedValidate = debounce(validate, 1000); // Debounce the validate function

  return async (_rule: any, value: string, handleResolver: any) => {
    const res = await debouncedValidate(value, handleResolver); // Call the debounced validate function
    return !res ? Promise.resolve() : Promise.reject(res);
  };
};

export const EditAddressForm = ({
  form,
  initialValues,
  validations,
  translations,
  footer
}: EditAddressFormProps): ReactElement => {
  const addressValue = Form.useWatch('address', form);

  const nameValidator = getValidator(validations.name);
  const addressValidator = getValidator(validations.address);
  const handleValidator = useMemo(() => getValidatorWithResolver(validations.handle), [getValidatorWithResolver]);

  const isAddressHandle = isHandle(addressValue);

  return (
    <Form
      form={form}
      data-testid="address-form"
      name="address-form"
      initialValues={initialValues}
      autoComplete="off"
      className={styles.form}
    >
      {() => {
        const isAddressFieldValid = form.getFieldError('address').length === 0;
        const isAddressFieldValidating = form.isFieldValidating('address');

        const renderSuffix = () => {
          if (!isAddressHandle) return;
          return isAddressFieldValid ? (
            <CheckCircleOutlined className={styles.valid} />
          ) : (
            <CloseCircleOutlined className={styles.invalid} />
          );
        };

        return (
          <>
            <div className={styles.body}>
              <div>
                <Form.Item name="name" rules={[{ validator: nameValidator }]} className={styles.inputWrapper}>
                  <Input
                    className={styles.input}
                    label={translations.walletName}
                    dataTestId="address-form-name-input"
                  />
                </Form.Item>
                <Form.Item
                  name="address"
                  className={styles.inputWrapper}
                  rules={[{ validator: isAddressHandle ? handleValidator : addressValidator }]}
                >
                  <Search
                    className={cn(styles.input, styles.textArea)}
                    invalid={!isAddressFieldValid}
                    label={translations.address}
                    dataTestId="address-form-address-input"
                    customIcon={!isAddressFieldValidating && renderSuffix()}
                    loading={isAddressFieldValidating}
                  />
                </Form.Item>
              </div>
            </div>
            {footer && (
              <div className={styles.footerContainer}>
                <div className={styles.border} />
                {footer}
              </div>
            )}
          </>
        );
      }}
    </Form>
  );
};
