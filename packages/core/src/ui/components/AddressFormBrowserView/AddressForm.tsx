/* eslint-disable consistent-return */
import React, { useCallback, useEffect, useMemo } from 'react';
import { Form } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, PlusCircleOutlined } from '@ant-design/icons';
import classnames from 'classnames';
import { Input, Button, Search } from '@lace/common';
import { ReactComponent as PlusIcon } from '../../assets/icons/plus.component.svg';
import { ReactComponent as PlusIconDisabled } from '../../assets/icons/plus-disabled.component.svg';
import styles from './AddressForm.module.scss';
import { TranslationsFor } from '@ui/utils/types';
import { AddressValidators, getValidator, getValidatorWithResolver, isHandle, valuesPropType } from '@src/ui/utils';

export type AddressFormPropsBrowserView = {
  initialValues: valuesPropType;
  onConfirmClick: (values: valuesPropType) => unknown;
  validations: AddressValidators;
  onClose?: () => void;
  translations: TranslationsFor<'addAddress' | 'name' | 'address' | 'addNew' | 'addNewSubtitle'>;
};

export const AddressFormBrowserView = ({
  initialValues,
  onConfirmClick,
  validations,
  onClose,
  translations
}: AddressFormPropsBrowserView): React.ReactElement => {
  const [form] = Form.useForm<valuesPropType>();
  const addressValue = Form.useWatch('address', form);

  const isAddressHandle = addressValue && isHandle(addressValue);

  const resetForm = useCallback(() => {
    form.resetFields();
  }, [form]);

  useEffect(() => {
    resetForm();
  }, [resetForm]);

  const nameValidator = getValidator(validations.name);
  const addressValidator = getValidator(validations.address);
  const handleValidator = useMemo(() => getValidatorWithResolver(validations.handle), [validations.handle]);

  const onFormSubmit = async () => {
    try {
      await onConfirmClick(form.getFieldsValue());
      resetForm();
      form.resetFields();
      if (onClose) onClose();
    } catch (error) {
      console.error('Error while submitting new address', error);
    }
  };
  const Plus = PlusIcon ? <PlusIcon className={styles.icon} /> : <PlusCircleOutlined />;
  const PlusDisabled = PlusIconDisabled ? <PlusIconDisabled className={styles.icon} /> : <PlusCircleOutlined />;

  return (
    <Form
      form={form}
      data-testid="address-form"
      name="address-form"
      initialValues={initialValues}
      onFinish={onFormSubmit}
      autoComplete="off"
      className={styles.form}
    >
      {() => {
        const isAddressFieldValid = form.getFieldError('address').length === 0;
        const isAddressFieldValidating = form.isFieldValidating('address');

        const renderSuffix = () =>
          isAddressFieldValid ? (
            <CheckCircleOutlined className={styles.valid} />
          ) : (
            <CloseCircleOutlined className={styles.invalid} />
          );

        return (
          <>
            <div className={styles.title} data-testid="drawer-header-title">
              {translations.addNew}
            </div>
            <div className={styles.subTitle}>{translations.addNewSubtitle}</div>
            <div className={styles.formContent}>
              <Form.Item name="name" rules={[{ validator: nameValidator }]} className={styles.inputWrapper}>
                <Input className={styles.input} label={translations.name} dataTestId="address-form-name-input" />
              </Form.Item>
              <Form.Item
                name="address"
                className={styles.inputWrapper}
                rules={[{ validator: isAddressHandle ? handleValidator : addressValidator }]}
              >
                <Search
                  className={classnames(styles.input, styles.textArea)}
                  invalid={!isAddressFieldValid}
                  label={translations.address}
                  dataTestId="address-form-address-input"
                  customIcon={!isAddressFieldValidating && isAddressHandle ? renderSuffix() : undefined}
                  loading={isAddressFieldValidating}
                />
              </Form.Item>
              <Form.Item className={styles.actions} shouldUpdate>
                {() => {
                  const hasErrors = form.getFieldsError(['name', 'address']).some(({ errors }) => errors?.length);
                  const isValidating = form.isFieldsValidating(['name', 'address']);
                  const isTouched = form.isFieldsTouched(['name', 'address'], true);

                  return (
                    <div data-testid="address-form-buttons">
                      <Button
                        disabled={hasErrors || isValidating || !isTouched}
                        htmlType="submit"
                        className={styles.submitBtn}
                        color="gradient"
                        size="large"
                        block
                      >
                        {!hasErrors && !isValidating && isTouched ? Plus : PlusDisabled}
                        {translations.addAddress}
                      </Button>
                    </div>
                  );
                }}
              </Form.Item>
            </div>
          </>
        );
      }}
    </Form>
  );
};
