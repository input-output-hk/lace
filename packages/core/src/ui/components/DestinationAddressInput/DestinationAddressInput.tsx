import React, { useState, useEffect, useMemo } from 'react';
import classnames from 'classnames';
import { AutoCompleteProps, Button } from 'antd';
import { Search, SearchProps, Ellipsis } from '@lace/common';
import { ReactComponent as BookIcon } from '../../assets/icons/book-icon.component.svg';
import { ReactComponent as AddAddress } from '../../assets/icons/add.component.svg';
import { ReactComponent as AvailableAddress } from '../../assets/icons/close-icon.component.svg';
import styles from './DestinationAddressInput.module.scss';
import { TranslationsFor } from '@ui/utils/types';

export type DestinationAddressInputProps = Omit<AutoCompleteProps, 'value'> & {
  value: string | { name: string; address: string };
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
  ...rest
}: DestinationAddressInputProps): React.ReactElement => {
  const [focused, setFocused] = useState<boolean>(false);

  useEffect(() => {
    if (typeof value === 'object') setFocused(false);
  }, [value]);

  let Icon;
  if (exists) {
    Icon = <AvailableAddress className={styles.icon} />;
  } else {
    Icon = validationObject?.address ? <AddAddress className={styles.icon} /> : <BookIcon className={styles.icon} />;
  }
  const addressBookBtn = (
    <Button
      disabled={!valid && !empty}
      data-testid="address-book-btn"
      onClick={valid || empty ? onClick : undefined}
      className={styles.addressBookBtn}
      size="small"
    >
      {Icon}
    </Button>
  );

  const children = useMemo(() => {
    if (typeof value === 'object') {
      return getInputLabel(value.name, value.address);
    }
    return validationObject?.address ? (
      <Ellipsis className={styles.validAddress} withTooltip={false} text={value} ellipsisInTheMiddle />
    ) : undefined;
  }, [value, validationObject?.address]);

  return (
    <Search
      className={classnames(className, styles.searchAddress)}
      value={typeof value === 'object' ? value.address : value}
      inputPlaceholder={translations.recipientAddress}
      onChange={onChange}
      options={options}
      customIcon={addressBookBtn}
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
