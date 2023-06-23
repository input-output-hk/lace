import React, { useRef, useState } from 'react';
import type { MouseEvent, FocusEvent } from 'react';

import classNames from 'classnames';

import { ClearButton } from './search-box-clear-button.component';
import { SearchIcon } from './search-box-icon.component';
import { InputField } from './search-box-input-field.component';
import * as cx from './search-box.css';

import type { OmitClassName } from '../../types';

export type Props = Omit<OmitClassName<'input'>, 'onChange'> & {
  onClear?: () => void;
  onChange?: (value: string) => void;
  active?: boolean;
  value?: string;
  clearButtonAriaLabel?: string;
  placeholder?: string;
};

export const SearchBox = ({
  onClear,
  onFocus,
  onBlur,
  onChange,
  active = false,
  value = '',
  disabled,
  clearButtonAriaLabel,
  ...props
}: Readonly<Props>): JSX.Element => {
  const inputReference = useRef<HTMLInputElement>(null);
  const [isActive, setIsActive] = useState(active);
  const clearButtonReference = useRef<HTMLButtonElement>(null);

  const handleClick = (): void => {
    if (inputReference.current) {
      inputReference.current.focus();
    }
  };

  const handleClearClick = (
    event: Readonly<MouseEvent<HTMLButtonElement>>,
  ): void => {
    event.stopPropagation();
    if (onClear) {
      onClear();
    }
  };

  const handleFocus = (event: Readonly<FocusEvent<HTMLInputElement>>): void => {
    setIsActive(true);
    if (onFocus) {
      onFocus(event);
    }
  };

  const handleBlur = (event: Readonly<FocusEvent<HTMLInputElement>>): void => {
    const relatedTarget = event.relatedTarget as HTMLElement | null;
    if (relatedTarget == clearButtonReference.current) {
      return;
    }

    setIsActive(false);
    if (onBlur) {
      onBlur(event);
    }
  };

  const shouldShowClearButton = isActive && value.length > 0;

  return (
    <div
      className={classNames(cx.container, {
        [cx.active]: isActive,
        [cx.disabled]: disabled,
      })}
      onClick={handleClick}
    >
      <SearchIcon />
      <InputField
        {...props}
        ref={inputReference}
        onBlur={handleBlur}
        onFocus={handleFocus}
        onChange={(event): void => onChange?.(event.target.value)}
        active={isActive}
        value={value}
        disabled={disabled}
      />
      {shouldShowClearButton ? (
        <ClearButton
          onClick={handleClearClick}
          active={shouldShowClearButton}
          aria-label={clearButtonAriaLabel}
          ref={clearButtonReference}
        />
      ) : undefined}
    </div>
  );
};
