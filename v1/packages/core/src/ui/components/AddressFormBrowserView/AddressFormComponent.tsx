import React from 'react';
import { Form, FormProps, FormItemProps } from 'antd';
import { Input, TextArea } from '@lace/common';
import styles from './AddressForm.module.scss';

export type AddressFormComponentProps = {
  fromProps: FormProps;
  validationRules: {
    nameValidator: FormItemProps['rules'];
    addressValidator: FormItemProps['rules'];
  };
  itemsLabels?: {
    nameLabel?: string;
    addressLabel?: string;
  };
  itemsErros?: {
    addressError?: string;
  };
};

export const AddressFormComponent = ({
  fromProps,
  validationRules: { nameValidator, addressValidator },
  itemsErros: { addressError } = {},
  itemsLabels: { nameLabel = 'Name', addressLabel = 'Address' } = {}
}: AddressFormComponentProps): React.ReactElement => (
  <Form
    data-testid="address-form"
    name="address-form"
    autoComplete="off"
    {...fromProps}
    className={styles.addressFormComponent}
  >
    <div className={styles.formContent}>
      <Form.Item name="name" rules={nameValidator} className={styles.inputWrapper}>
        <Input className={styles.input} label={nameLabel} dataTestId="address-form-name-input" />
      </Form.Item>
      <Form.Item name="address" className={styles.inputWrapper} rules={addressValidator}>
        <TextArea
          className={styles.textArea}
          invalid={!!addressError || undefined}
          label={addressLabel}
          dataTestId="address-form-address-input"
        />
      </Form.Item>
    </div>
  </Form>
);
