import React from 'react';

import cn from 'classnames';

import { ReactComponent as CloseEye } from '../../assets/icons/eye-close.component.svg';
import { ReactComponent as OpenEye } from '../../assets/icons/eye-open.component.svg';

import * as cx from './password-box-button.css';

interface PasswordBoxButtonProps {
  onClick: (event: Readonly<React.MouseEvent<HTMLButtonElement>>) => void;
  disabled: boolean;
  isPasswordVisible: boolean;
}

export const PasswordInputButton = ({
  onClick,
  disabled,
  isPasswordVisible,
}: Readonly<PasswordBoxButtonProps>): JSX.Element => {
  return (
    <button className={cx.inputButton} onClick={onClick} disabled={disabled}>
      {isPasswordVisible ? (
        <OpenEye
          className={cn(cx.inputButtonIcon, {
            [cx.disabledInputButtonIcon]: disabled,
          })}
        />
      ) : (
        <CloseEye
          className={cn(cx.inputButtonIcon, {
            [cx.disabledInputButtonIcon]: disabled,
          })}
        />
      )}
    </button>
  );
};
