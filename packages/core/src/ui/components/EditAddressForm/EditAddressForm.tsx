import React, { ReactElement } from 'react';
import cn from 'classnames';
import { Form } from 'antd';
import { Input, TextArea } from '@lace/common';
import styles from './EditAddressForm.module.scss';
import { TranslationsFor } from '@ui/utils/types';

type ValidationOptionsProps<T extends string> = Record<T, (key: string) => string>;

type valuesPropType = {
  id?: number;
  name?: string;
  address?: string;
};

type FormKeys = keyof Omit<valuesPropType, 'id'>;

export type EditAddressFormProps = {
  initialValues: valuesPropType;
  validations: ValidationOptionsProps<FormKeys>;
  setFormValues: (values: valuesPropType) => void;
  getFieldError: (keys: FormKeys) => string;
  footer?: ReactElement;
  translations: TranslationsFor<'walletName' | 'address'>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getValidator = (validate: (val: string) => string) => (_rule: any, value: string) => {
  const res = validate(value);
  return res ? Promise.reject(res) : Promise.resolve();
};

export const EditAddressForm = ({
  initialValues,
  setFormValues,
  validations,
  getFieldError,
  footer,
  translations
}: EditAddressFormProps): ReactElement => {
  const [form] = Form.useForm();
  const addressValidator = getValidator(validations.address);
  const nameValidator = getValidator(validations.name);

  const validateOnBlur = (targetField: string, dependingField: 'name' | 'address') => {
    const hasErrors = form.getFieldsError([dependingField])[0].errors.length > 0;
    const isFieldNotEmpty = form.getFieldValue(dependingField)?.length > 0;
    const shouldValidateField = isFieldNotEmpty && !hasErrors;
    if (shouldValidateField) {
      form.validateFields([targetField]);
    }
    const areFieldsEmpty = !form.getFieldValue('name') && !form.getFieldValue('address');
    if (areFieldsEmpty) form.resetFields();
  };

  return (
    <Form
      form={form}
      data-testid="address-form"
      name="address-form"
      initialValues={initialValues}
      autoComplete="off"
      className={styles.form}
      onValuesChange={(_val: string, values: valuesPropType) => setFormValues(values)}
    >
      <div className={styles.body}>
        <div>
          <Form.Item name="name" rules={[{ validator: nameValidator }]} className={styles.inputWrapper}>
            <Input
              onBlur={() => validateOnBlur('name', 'address')}
              className={styles.input}
              label={translations.walletName}
              dataTestId="address-form-name-input"
            />
          </Form.Item>
          <Form.Item name="address" className={styles.inputWrapper} rules={[{ validator: addressValidator }]}>
            <TextArea
              onBlur={() => validateOnBlur('address', 'name')}
              className={cn(styles.input, styles.textArea)}
              wrapperClassName={styles.textAreaWrapper}
              invalid={!!getFieldError('address') || undefined}
              label={translations.address}
              dataTestId="address-form-address-input"
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
    </Form>
  );
};
