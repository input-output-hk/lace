import { InputProps } from 'antd';
import React, { ReactElement, useRef } from 'react';
import styles from './Password.module.scss';
import { ReactComponent as OpenEye } from '../../../assets/icons/eye.component.svg';
import { ReactComponent as CloseEye } from '../../../assets/icons/eyeDisabled.component.svg';
import cn from 'classnames';
import { useAutoFocus } from '@src/ui/hooks';

export type Password = {
  input: HTMLInputElement;
  // TODO: convert this to UInt8Array
  value: string;
};
export type OnPasswordChange = (password: Password) => void;
export type PasswordProps = {
  error?: boolean;
  autoFocus?: boolean;
  errorMessage?: string;
  wrapperClassName?: string;
  label?: string;
  dataTestId?: string;
  onChange: OnPasswordChange;
} & Omit<InputProps, 'onChange' | 'value'>;

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
  label,
  autoFocus = false,
  ...rest
}: PasswordProps): React.ReactElement => {
  const inputRef = useRef<HTMLInputElement>();
  // const [isVisible, setIsVisible] = useState<boolean>(false);

  const onValChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.({ input: e.target, value: e.target.value });
  };

  // const handleVisibilitySwitch = (visible: boolean) => {
  //   setIsVisible(visible);
  //   return getVisibilityIcon(visible);
  // };

  useAutoFocus(inputRef, !!autoFocus);

  return (
    <div
      className={cn(styles.inputPasswordContainer, { [wrapperClassName]: wrapperClassName })}
      data-testid="password-input-container"
    >
      <span className={styles.inputWrapper}>
        {/* TODO: replace this with some prettier input; antd input makes password stay in-memory */}
        <input
          type="password"
          ref={inputRef}
          onChange={onValChange}
          data-testid={dataTestId}
          spellCheck={false}
          placeholder={placeholder}
          // {...(label && {
          //   prefix: <div className={cn(styles.label, { [styles.filled]: inputRef.current?.value })}>{label}</div>
          // })}
          // {...rest}
          className={cn(styles.inputPassword, {
            [rest.className]: rest.className,
            [styles.withLabel]: label && inputRef.current?.value
            // [styles.largeDots]: !isVisible
          })}
          // iconRender={(visible) => handleVisibilitySwitch(visible)}
          autoComplete="new-password"
        />
        {error && <p data-testid="password-input-error">{errorMessage}</p>}
      </span>
    </div>
  );
};
