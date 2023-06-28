import React, { useState, useEffect, useMemo } from 'react';
import classnames from 'classnames';
import { AutoCompleteProps, Button } from 'antd';
import { Search, SearchProps, Ellipsis } from '@lace/common';
import { ReactComponent as BookIcon } from '../../assets/icons/book-icon.component.svg';
import { ReactComponent as AddAddress } from '../../assets/icons/add.component.svg';
import { ReactComponent as AvailableAddress } from '../../assets/icons/close-icon.component.svg';
import styles from './DestinationAddressInput.module.scss';
import { TranslationsFor } from '@ui/utils/types';
import { CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';

export type DestinationAddressInputProps = Omit<AutoCompleteProps, 'value'> & {
  value: { name?: string; address: string };
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
  handle?: 'valid' | 'verifying' | 'invalid';
  translations: TranslationsFor<'recipientAddress'>;
};

export const getInputLabel = (name: string, address: string): React.ReactElement => (
  <div data-testid="search-result-row" className={styles.addressOption}>
    <span data-testid="search-result-name">{name}</span>
    <span data-testid="search-result-address">
      <Ellipsis className={styles.option} withTooltip={false} text={address} ellipsisInTheMiddle />
    </span>
  </div>
);

export const DestinationAddressInput = ({
  value,
  onChange,
  options,
  onClick,
  className,
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
    if (value.name) setFocused(false);
  }, [value]);

  const customIcon = useMemo(() => {
    let Icon;
    if (exists) {
      Icon = <AvailableAddress className={styles.icon} />;
    } else {
      Icon = validationObject?.address ? <AddAddress className={styles.icon} /> : <BookIcon className={styles.icon} />;
    }

    let handleIcon;
    if (handle === 'valid') {
      handleIcon = <CheckCircleOutlined className={styles.valid} />;
    } else if (handle === 'invalid') {
      handleIcon = <ExclamationCircleOutlined className={styles.invalid} />;
    }
    return (
      <>
        {handleIcon}
        <Button
          disabled={(!valid && !empty) || (handle && handle !== 'valid')}
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
    if (value.name) {
      return getInputLabel(value.name, value.address);
    }
    return validationObject?.address ? (
      <Ellipsis className={styles.validAddress} withTooltip={false} text={value.address} ellipsisInTheMiddle />
    ) : undefined;
  }, [value, validationObject?.address]);

  return (
    <Search
      className={classnames(className, styles.searchAddress)}
      value={value.address}
      label={translations.recipientAddress}
      onChange={onChange}
      options={options}
      loading={handle === 'verifying'}
      customIcon={customIcon}
      disabled={exists}
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
