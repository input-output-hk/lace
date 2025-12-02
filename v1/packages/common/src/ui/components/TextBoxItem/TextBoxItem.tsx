/* eslint-disable react/prop-types */
import React, { forwardRef } from 'react';
import classnames from 'classnames';
import { ReactComponent as AtSing } from '../../assets/icons/at-sign.component.svg';
import { ReactComponent as CheckCircle } from '../../assets/icons/check-circle.component.svg';
import { ReactComponent as Remove } from '../../assets/icons/remove-icon.component.svg';
import { ReactComponent as UserPlus } from '../../assets/icons/user-plus.component.svg';
import { ReactComponent as Eye } from '../../assets/icons/eye.component.svg';
import { ReactComponent as EyeDisabled } from '../../assets/icons/eyeDisabled.component.svg';
import { ReactComponent as Cross } from '../../assets/icons/cross.component.svg';
import styles from './TextBoxItem.module.scss';

type TextBoxIcons = 'at-sign' | 'check-circle' | 'remove' | 'user-plus' | 'eye' | 'eye-disabled' | 'cross';
type TextBoxIconsIconsMap = Record<TextBoxIcons, React.FC<React.SVGProps<SVGSVGElement>>>;

const textBoxIcons: TextBoxIconsIconsMap = {
  eye: Eye,
  remove: Remove,
  cross: Cross,
  'at-sign': AtSing,
  'check-circle': CheckCircle,
  'user-plus': UserPlus,
  'eye-disabled': EyeDisabled
};

export type TextBoxItemProps = {
  testId?: string;
  icon?: TextBoxIcons;
  customIcon?: React.ReactNode;
  iconClassName?: string;
} & React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement>;

export const TextBoxItem = forwardRef<HTMLButtonElement, TextBoxItemProps>(
  ({ testId = 'text-box-item', icon = 'remove', customIcon, iconClassName, ...rest }, ref) => {
    const Icon = textBoxIcons[icon];

    return (
      <button className={styles.textBoxBtn} ref={ref} type="button" {...rest} data-testid={testId}>
        {customIcon || <Icon className={classnames(styles.textBoxIcon, iconClassName)} />}
      </button>
    );
  }
);
