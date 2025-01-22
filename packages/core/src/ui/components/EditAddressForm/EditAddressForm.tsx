import React, { ReactElement, useLayoutEffect, useMemo } from 'react';
import cn from 'classnames';
import { Form, FormInstance } from 'antd';
import { Input, Search } from '@lace/common';
import styles from './EditAddressForm.module.scss';
import { TranslationsFor } from '@ui/utils/types';
import {
  isHandle,
  getValidator,
  getValidatorWithResolver,
  AddressValidators,
  addressKey,
  valuesPropType
} from '@src/ui/utils';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';

export type EditAddressFormProps = {
  form: FormInstance;
  initialValues: valuesPropType;
  validations: AddressValidators;
  translations: TranslationsFor<'walletName' | 'address'>;
  footer?: React.ReactNode;
};

const isAdaHandleEnabled = process.env.USE_ADA_HANDLE === 'true';

export const EditAddressForm = ({
  form,
  initialValues,
  validations,
  translations,
  footer
}: EditAddressFormProps): ReactElement => {
  const addressValue = Form.useWatch(addressKey, form);

  const nameValidator = getValidator(validations.name);
  const addressValidator = getValidator(validations.address);
  const handleValidator = useMemo(() => getValidatorWithResolver(validations.handle), [validations.handle]);

  const isAddressHandle = isHandle(addressValue);

  useLayoutEffect(() => {
    form.resetFields();
  }, [form]);

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
        const isAddressFieldValid = form.getFieldError(addressKey).length === 0;
        const isAddressFieldValidating = form.isFieldValidating(addressKey);
        const renderSuffix = () =>
          isAddressFieldValid ? (
            <CheckCircleOutlined className={styles.valid} />
          ) : (
            <CloseCircleOutlined className={styles.invalid} />
          );

        return (
          <>
            <div className={styles.body}>
              <div>
                <Form.Item
                  name="name"
                  rules={[{ validator: nameValidator }]}
                  className={cn(styles.inputWrapper, styles.nameWrapper)}
                >
                  <Input
                    className={styles.input}
                    label={translations.walletName}
                    dataTestId="address-form-name-input"
                  />
                </Form.Item>
                <Form.Item
                  name="address"
                  className={styles.inputWrapper}
                  rules={[{ validator: isAddressHandle && isAdaHandleEnabled ? handleValidator : addressValidator }]}
                >
                  <Search
                    className={cn(styles.textArea)}
                    invalid={!isAddressFieldValid}
                    label={translations.address}
                    dataTestId="address-form-address-input"
                    customIcon={(!isAddressFieldValidating && isAddressHandle && renderSuffix()) || undefined}
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
