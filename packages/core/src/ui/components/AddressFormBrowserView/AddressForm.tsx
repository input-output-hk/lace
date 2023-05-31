import React, { useCallback, useEffect, useState } from 'react';
import { Form } from 'antd';
import { PlusCircleOutlined } from '@ant-design/icons';

import { Input, TextArea, Button } from '@lace/common';
import { ReactComponent as PlusIcon } from '../../assets/icons/plus.component.svg';
import { ReactComponent as PlusIconDisabled } from '../../assets/icons/plus-disabled.component.svg';
import styles from './AddressForm.module.scss';
import { TranslationsFor } from '@ui/utils/types';

type valueKeys = 'name' | 'address';
export type ValidationOptionsProps<T extends string> = Record<T, (key: string) => string>;

export type valuesPropType = Partial<Record<valueKeys, string>>;
export type FormKeys = keyof valuesPropType;

export type AddressFormPropsBrowserView = {
  initialValues: valuesPropType;
  onConfirmClick: (values: valuesPropType) => unknown;
  validations: ValidationOptionsProps<FormKeys>;
  onClose?: () => void;
  translations: TranslationsFor<'addAddress' | 'name' | 'address' | 'addNew' | 'addNewSubtitle'>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getValidator = (validate: (val: string) => string) => (_rule: any, value: string) => {
  const res = validate(value);
  return !res ? Promise.resolve() : Promise.reject(res);
};

export const AddressFormBrowserView = ({
  initialValues,
  onConfirmClick,
  validations,
  onClose,
  translations
}: AddressFormPropsBrowserView): React.ReactElement => {
  const [formValues, setFormValues] = useState<valuesPropType>(initialValues || {});
  const [form] = Form.useForm();

  const resetForm = useCallback(() => {
    form.resetFields();
  }, [form]);

  useEffect(() => {
    resetForm();
  }, [resetForm]);

  useEffect(() => {
    setFormValues(initialValues);
  }, [initialValues]);

  const addressValidator = getValidator(validations.address);
  const nameValidator = getValidator(validations.name);

  const getFieldError = (key: FormKeys) => validations[key]?.(formValues[key]);

  const isFormValid = () => {
    const formKeys: Array<FormKeys> = Object.keys(validations) as FormKeys[];
    return !formKeys.some((key) => !!getFieldError(key));
  };

  const onFormSubmit = async () => {
    if (isFormValid()) {
      try {
        await onConfirmClick(formValues);
        resetForm();
        setFormValues({});
        if (onClose) onClose();
      } catch (error) {
        console.log('error while submitting new address', error);
      }
    }
  };

  const Plus = PlusIcon ? <PlusIcon className={styles.icon} /> : <PlusCircleOutlined />;
  const PlusDisabled = PlusIconDisabled ? <PlusIconDisabled className={styles.icon} /> : <PlusCircleOutlined />;

  const validateOnBlur = (targetField: string, dependingField: valueKeys) => {
    const hasErrors = form.getFieldsError([dependingField])[0].errors.length > 0;
    const isFieldNotEmpty = formValues[dependingField]?.length > 0;
    const shouldValidateField = isFieldNotEmpty && !hasErrors;
    if (shouldValidateField) {
      form.validateFields([targetField]);
    }
    const areFieldsEmpty = !formValues?.address && !formValues?.name;
    if (areFieldsEmpty) resetForm();
  };

  return (
    <Form
      form={form}
      data-testid="address-form"
      name="address-form"
      initialValues={initialValues}
      onFinish={onFormSubmit}
      autoComplete="off"
      className={styles.form}
      onValuesChange={(_, values) => setFormValues(values)}
    >
      <div className={styles.title} data-testid="drawer-header-title">
        {translations.addNew}
      </div>
      <div className={styles.subTitle}>{translations.addNewSubtitle}</div>
      <div className={styles.formContent}>
        <Form.Item name="name" rules={[{ validator: nameValidator }]} className={styles.inputWrapper}>
          <Input
            onBlur={() => validateOnBlur('name', 'address')}
            className={styles.input}
            label={translations.name}
            dataTestId="address-form-name-input"
          />
        </Form.Item>
        <Form.Item name="address" className={styles.inputWrapper} rules={[{ validator: addressValidator }]}>
          <TextArea
            onBlur={() => validateOnBlur('address', 'name')}
            className={styles.textArea}
            invalid={!!getFieldError('address') || undefined}
            label={translations.address}
            dataTestId="address-form-address-input"
          />
        </Form.Item>
        <Form.Item className={styles.actions}>
          <div data-testid="address-form-buttons">
            <Button
              disabled={!isFormValid()}
              htmlType="submit"
              className={styles.submitBtn}
              color="gradient"
              size="large"
              block
            >
              {isFormValid() ? Plus : PlusDisabled}
              {translations.addAddress}
            </Button>
          </div>
        </Form.Item>
      </div>
    </Form>
  );
};
