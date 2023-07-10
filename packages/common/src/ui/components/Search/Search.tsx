import React, { useRef } from 'react';
import classnames from 'classnames';
import Icon from '@ant-design/icons';
import { AutoComplete, AutoCompleteProps, Button, InputRef } from 'antd';
import { ReactComponent as SearchIcon } from '../../assets/icons/search.component.svg';
import { ReactComponent as Cross } from '../../assets/icons/cross.component.svg';
import { ReactComponent as Loader } from '../../assets/icons/loader.component.svg';
import styles from './Search.module.scss';
import { Input } from '../Form';

export type SearchProps = AutoCompleteProps & {
  customIcon?: React.ReactElement;
  withCustomIcon?: boolean;
  withSearchIcon?: boolean;
  inputPlaceholder?: string;
  showClear?: boolean;
  onClearButtonClick?: React.MouseEventHandler<HTMLElement>;
  onInputFocus?: () => void;
  onInputBlur?: () => void;
  invalid?: boolean;
  isFocus?: boolean;
  loading?: boolean;
  label?: string;
  dataTestId?: string;
};

const AUTO_COMPLETE_DROPDOWN_OFFSET_X = 0;
const AUTO_COMPLETE_DROPDOWN_OFFSET_Y = 1;

export const Search = ({
  customIcon,
  withSearchIcon,
  inputPlaceholder,
  value,
  showClear,
  onClearButtonClick,
  disabled,
  label,
  className,
  invalid,
  onInputFocus,
  onInputBlur,
  children,
  isFocus,
  options,
  loading,
  dataTestId,
  ...rest
}: SearchProps): React.ReactElement => {
  const inputRef = useRef<InputRef>();
  const onContainerClick = () => {
    if (inputRef?.current) {
      inputRef.current.focus();
    }
  };

  return (
    <AutoComplete
      dropdownAlign={{
        offset: [AUTO_COMPLETE_DROPDOWN_OFFSET_X, AUTO_COMPLETE_DROPDOWN_OFFSET_Y]
      }}
      dropdownClassName={styles.dropdown}
      data-testid={dataTestId || 'search'}
      disabled={disabled}
      options={isFocus ? options : []}
      {...rest}
      className={styles.autoComplete}
    >
      <div
        onClick={onContainerClick}
        data-testid="search-input-container"
        className={classnames(className, styles.inputSearch, { [styles.disabled]: disabled, [styles.focus]: isFocus })}
      >
        {withSearchIcon && <SearchIcon className={styles.searchIcon} data-testid="search-icon" />}
        <div className={styles.content}>
          <Input
            className={classnames({ [styles.invalid]: invalid })}
            disabled={disabled}
            value={value}
            data-testid="search-input"
            placeholder={inputPlaceholder}
            label={label}
            bordered={false}
            onFocus={onInputFocus}
            onBlur={onInputBlur}
          />
          {children}
        </div>

        {loading && (
          <span className={styles.loaderContainer} data-testid="search-loader">
            <Icon className={styles.loader} component={Loader} />
          </span>
        )}
        {customIcon}
        {showClear && (
          <Button data-testid="address-book-btn" onClick={onClearButtonClick} className={styles.clear} size="small">
            <Cross className={styles.icon} />
          </Button>
        )}
      </div>
    </AutoComplete>
  );
};
