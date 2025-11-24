import React, { useState, useEffect, useMemo } from 'react';
import { AutoCompleteProps, Button } from 'antd';
import { Search, SearchProps, addEllipsis } from '@lace/common';
import { HandleResolution } from '@cardano-sdk/core';
import { ReactComponent as BookIcon } from '../../assets/icons/book-icon.component.svg';
import { ReactComponent as AddAddress } from '../../assets/icons/add.component.svg';
import { ReactComponent as AvailableAddress } from '../../assets/icons/close-icon.component.svg';
import styles from './DestinationAddressInput.module.scss';
import { TranslationsFor } from '@ui/utils/types';
import { CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';

const charBeforeNameEllipsis = 6;
const charBeforeAddressEllipsis = 10;
const charAfterAddressEllipsis = 6;

enum HandleVerificationState {
  VALID = 'valid',
  INVALID = 'invalid',
  VERIFYING = 'verifying',
  CHANGED_OWNERSHIP = 'changedOwnership'
}

type HandleIcons = {
  [key in HandleVerificationState]: JSX.Element | undefined;
};

export type DestinationAddressInputProps = Omit<AutoCompleteProps, 'value'> & {
  value: { name?: string; address: string; handleResolution?: HandleResolution };
  validationObject: { name: boolean; address: boolean };
  options: SearchProps['options'];
  onChange: SearchProps['onChange'];
  onClick?: (event: React.MouseEvent<HTMLElement, MouseEvent>) => void;
  className?: string;
  valid?: boolean;
  empty?: boolean;
  exists?: boolean;
  showClear?: boolean;
  onClear?: () => void;
  handle?: HandleVerificationState;
  translations: TranslationsFor<'recipientAddress'>;
};

export const getInputLabel = (name: string, address: string): React.ReactElement => (
  <div data-testid="search-result-row" className={styles.addressOption}>
    <span data-testid="search-result-name">{addEllipsis(name, charBeforeNameEllipsis, 0)}</span>
    <span data-testid="search-result-address">
      <p className={styles.option}>{addEllipsis(address, charBeforeAddressEllipsis, charAfterAddressEllipsis)}</p>
    </span>
  </div>
);

export const DestinationAddressInput = ({
  value,
  onChange,
  options,
  onClick,
  valid,
  empty,
  exists,
  validationObject,
  translations,
  handle,
  ...rest
}: DestinationAddressInputProps): React.ReactElement => {
  const [focused, setFocused] = useState<boolean>(false);

  useEffect(() => {
    if (value.name && handle === HandleVerificationState.VERIFYING) setFocused(false);
  }, [value, handle]);

  const customIcon = useMemo(() => {
    let Icon;
    if (exists) {
      Icon = <AvailableAddress className={styles.icon} />;
    } else {
      Icon = validationObject?.address ? <AddAddress className={styles.icon} /> : <BookIcon className={styles.icon} />;
    }

    const handleIcons: HandleIcons = {
      [HandleVerificationState.VALID]: <CheckCircleOutlined className={styles.valid} />,
      [HandleVerificationState.CHANGED_OWNERSHIP]: <CheckCircleOutlined className={styles.valid} />,
      [HandleVerificationState.INVALID]: <ExclamationCircleOutlined className={styles.invalid} />,
      [HandleVerificationState.VERIFYING]: undefined
    };
    const handleIcon = (handle && handleIcons[handle]) || undefined;

    const shouldClearButtonBeDisabled =
      (!valid && !empty) ||
      (handle && handle !== HandleVerificationState.VALID && handle !== HandleVerificationState.CHANGED_OWNERSHIP);
    return (
      <>
        {handleIcon}
        <Button
          disabled={shouldClearButtonBeDisabled}
          data-testid="address-book-btn"
          onClick={valid || empty ? onClick : undefined}
          className={styles.addressBookBtn}
          size="small"
        >
          {Icon}
        </Button>
      </>
    );
  }, [handle, valid, empty, validationObject, exists, onClick]);

  const children = useMemo(() => {
    if (handle === HandleVerificationState.CHANGED_OWNERSHIP) {
      return (
        value.name &&
        getInputLabel(`$${value.handleResolution?.handle}`, value.handleResolution?.cardanoAddress.toString() ?? '')
      );
    }
    return value.name && getInputLabel(value.name, value.address);
  }, [handle, value]);

  return (
    <Search
      value={value.address}
      label={translations.recipientAddress}
      onChange={onChange}
      options={options}
      loading={handle === HandleVerificationState.VERIFYING}
      customIcon={customIcon}
      disabled={exists || handle === HandleVerificationState.VERIFYING}
      invalid={valid === false}
      onInputBlur={() => setFocused(false)}
      onInputFocus={() => setFocused(true)}
      isFocus={focused}
      {...rest}
    >
      {children && !focused && <div className={styles.children}>{children}</div>}
    </Search>
  );
};
