import React, { useEffect, useRef, useState } from 'react';
import cn from 'classnames';
import { Input as AntdInput, InputProps } from 'antd';
import styles from './Input.module.scss';
import { useAutoFocus } from '@src/ui/hooks';

export type inputProps = {
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  value?: string;
  dataTestId?: string;
  label?: string;
  invalid?: boolean;
  focus?: boolean;
  labelClassName?: string;
  filledLabelOnFocus?: boolean;
} & InputProps;

export const Input = ({
  dataTestId,
  label,
  onChange,
  invalid,
  value,
  focus,
  labelClassName = '',
  filledLabelOnFocus,
  ...props
}: inputProps): React.ReactElement => {
  const inputRef = useRef(null);
  const [localVal, setLocalVal] = useState<string>('');
  const [isFocused, setIsFocused] = useState<boolean>(focus ?? false);
  const onValChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalVal(e?.target?.value ?? '');
    onChange?.(e);
  };

  useEffect(() => {
    setLocalVal(value ?? '');
  }, [value]);

  const onFocus = (event: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    props.onFocus?.(event);
  };

  const onBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    props.onBlur?.(event);
  };

  useAutoFocus(inputRef, focus);

  return (
    <AntdInput
      ref={inputRef}
      onChange={onValChange}
      {...(label && {
        prefix: (
          <div
            className={cn(
              styles.label,
              { [styles.filled]: localVal || (filledLabelOnFocus && isFocused) },
              labelClassName
            )}
            data-testid="input-label"
          >
            {label}
          </div>
        )
      })}
      value={localVal}
      data-testid={dataTestId}
      {...props}
      className={cn(styles.input, {
        ...(props.className && { [props.className]: props.className }),
        [styles.withLabel]: (localVal || (filledLabelOnFocus && isFocused)) && label,
        [styles.invalid]: invalid
      })}
      onFocus={onFocus}
      onBlur={onBlur}
    />
  );
};
