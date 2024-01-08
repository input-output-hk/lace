import React from 'react';
import type { ReactNode } from 'react';

import * as Checkbox from '@radix-ui/react-checkbox';
import cn from 'classnames';

import { ReactComponent as CheckIcon } from '../../assets/icons/check.component.svg';
import { Box } from '../box';

import * as cx from './check-box.css';

import type { OmitClassName } from '../../types';

export type Props = Readonly<
  OmitClassName<'button'> & {
    checked: boolean;
    disabled?: boolean;
    label?: ReactNode;
    className?: string;
    onClick: () => void;
  }
>;

export const Root = ({
  checked,
  disabled = false,
  onClick,
  label,
  className,
  ...props
}: Props): JSX.Element => (
  <Box
    className={cn(className, cx.root, {
      [cx.withLabel]: label !== undefined,
    })}
  >
    <Checkbox.Root
      {...props}
      checked={checked}
      disabled={disabled}
      onClick={onClick}
      className={cn(cx.checkbox, checked ? cx.checked : cx.unchecked, {
        [cx.disabled]: disabled,
      })}
    >
      <Checkbox.Indicator>
        <CheckIcon className={cx.icon} />
      </Checkbox.Indicator>
    </Checkbox.Root>
    {label !== undefined && (
      <Box
        className={cn(cx.label, {
          [cx.disabled]: disabled,
        })}
      >
        {label}
      </Box>
    )}
  </Box>
);
