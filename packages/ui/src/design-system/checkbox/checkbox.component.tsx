import React from 'react';
import type { ReactNode } from 'react';

import { ReactComponent as CheckIcon } from '@lace/icons/dist/CheckBoxComponent';
import * as RadixCheckbox from '@radix-ui/react-checkbox';
import cn from 'classnames';

import { Box } from '../box';

import * as cx from './checkbox.css';

import type { OmitClassName } from '../../types';

export type Props = Readonly<
  OmitClassName<'button'> & {
    checked: boolean;
    disabled?: boolean;
    label?: ReactNode;
    className?: string;
    onClick: (event: Readonly<MouseEvent>) => void;
  }
>;

export const Checkbox = ({
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
    <RadixCheckbox.Root
      {...props}
      checked={checked}
      disabled={disabled}
      onClick={onClick}
      className={cn(cx.checkbox, checked ? cx.checked : cx.unchecked, {
        [cx.disabled]: disabled,
      })}
    >
      <RadixCheckbox.Indicator>
        <CheckIcon className={cx.icon} />
      </RadixCheckbox.Indicator>
    </RadixCheckbox.Root>
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
