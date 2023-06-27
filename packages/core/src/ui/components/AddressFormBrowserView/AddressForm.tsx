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
import { HANDLE_DEBOUNCE_TIME, isHandle } from '@src/ui/utils';
import debounce from 'debounce-promise';

type valueKeys = 'name' | 'address';
export type ValidationOptionsProps<T extends string> = Record<T, (key: string) => string>;

export type valuesPropType = Partial<Record<valueKeys, string>>;
export type FormKeys = keyof valuesPropType;

type ValidatorFn = (_rule: any, value: string) => Promise<void>;
type ResolveAddressValidatorFn = (_rule: any, value: string, handleResolver: any) => Promise<void>;

export type AddressFormPropsBrowserView = {
  initialValues: valuesPropType;
  onConfirmClick: (values: valuesPropType) => unknown;
  validations: any;
  onClose?: () => void;
  translations: TranslationsFor<'addAddress' | 'name' | 'address' | 'addNew' | 'addNewSubtitle'>;
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
  const debouncedValidate = debounce(validate, HANDLE_DEBOUNCE_TIME);

  return async (_rule: any, value: string, handleResolver: any) => {
    const res = await debouncedValidate(value, handleResolver);
    return !res ? Promise.resolve() : Promise.reject(res);
  };
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

  const isAddressHandle = isHandle(addressValue);

  const resetForm = useCallback(() => {
    form.resetFields();
  }, [form]);

  useEffect(() => {
    resetForm();
  }, [resetForm]);

  const nameValidator = getValidator(validations.name);
  const addressValidator = getValidator(validations.address);
  const handleValidator = useMemo(() => getValidatorWithResolver(validations.handle), [getValidatorWithResolver]);

  const onFormSubmit = async () => {
    try {
      await onConfirmClick(form.getFieldsValue());
      resetForm();
      form.resetFields();
      if (onClose) onClose();
    } catch (error) {
      console.log('Error while submitting new address', error);
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
                  customIcon={!isAddressFieldValidating && renderSuffix()}
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
