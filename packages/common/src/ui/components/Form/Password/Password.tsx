import { Input, InputProps, InputRef } from 'antd';
import React, { ReactElement, useEffect, useRef, useState } from 'react';
import styles from './Password.module.scss';
import { ReactComponent as OpenEye } from '../../../assets/icons/eye.component.svg';
import { ReactComponent as CloseEye } from '../../../assets/icons/eyeDisabled.component.svg';
import cn from 'classnames';
import { useAutoFocus } from '@src/ui/hooks';

export type PasswordProps = {
  error?: boolean;
  autoFocus?: boolean;
  errorMessage?: string;
  wrapperClassName?: string;
  label?: string;
  value: string;
  dataTestId?: string;
} & InputProps;

export const getVisibilityIcon = (visible: boolean): ReactElement =>
  visible ? (
    <CloseEye className={styles.eyeIcon} data-testid="password-input-hide-icon" />
  ) : (
    <OpenEye className={styles.eyeIcon} data-testid="password-input-show-icon" />
  );

export const Password = ({
  wrapperClassName,
  error,
  errorMessage = 'invalid password',
  dataTestId = 'password-input',
  placeholder,
  onChange,
  value,
  label,
  autoFocus = false,
  ...rest
}: PasswordProps): React.ReactElement => {
  const inputRef = useRef<InputRef>();
  const [localVal, setLocalVal] = useState<string>('');
  const [isVisible, setIsVisible] = useState<boolean>(false);

  const onValChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalVal(e?.target?.value ?? '');
    onChange?.(e);
  };

  useEffect(() => setLocalVal(value), [value]);

  const handleVisibilitySwitch = (visible: boolean) => {
    setIsVisible(visible);
    return getVisibilityIcon(visible);
  };

  useAutoFocus(inputRef, !!autoFocus);

  return (
    <div
      className={cn(styles.inputPasswordContainer, { [wrapperClassName]: wrapperClassName })}
      data-testid="password-input-container"
    >
      <span className={styles.inputWrapper}>
        <Input.Password
          ref={inputRef}
          onChange={onValChange}
          data-testid={dataTestId}
          spellCheck={false}
          placeholder={placeholder}
          {...(label && {
            prefix: <div className={cn(styles.label, { [styles.filled]: localVal })}>{label}</div>
          })}
          value={localVal}
          {...rest}
          className={cn(styles.inputPassword, {
            [rest.className]: rest.className,
            [styles.withLabel]: label && localVal,
            [styles.largeDots]: !isVisible
          })}
          iconRender={(visible) => handleVisibilitySwitch(visible)}
          autoComplete="new-password"
        />
        {error && <p data-testid="password-input-error">{errorMessage}</p>}
      </span>
    </div>
  );
};
