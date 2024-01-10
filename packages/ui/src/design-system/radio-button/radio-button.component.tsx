import React from 'react';
import type { ReactNode } from 'react';

import * as RadioGroup from '@radix-ui/react-radio-group';
import cn from 'classnames';

import { Box } from '../box';
import { Flex } from '../flex';

import * as cx from './radio-button.css';

export type Props = Readonly<{
  disabled?: boolean;
  label?: ReactNode;
  className?: string;
  onValueChange: (value: string) => void;
  selectedValue: string;
  options: {
    value: string;
    label: string;
  }[];
}>;

export const RadioButton = ({
  disabled = false,
  onValueChange,
  className,
  selectedValue,
  options,
  ...props
}: Props): JSX.Element => (
  <Box className={cn(className, cx.root)}>
    <RadioGroup.Root
      {...props}
      value={selectedValue}
      disabled={disabled}
      onValueChange={onValueChange}
      className={cx.radioGroupRoot}
    >
      {options.map(({ value, label }) => (
        <Flex mb="$24" alignItems="center" h="$fill" key={value}>
          <RadioGroup.Item
            id={label}
            value={value}
            className={cn(
              cx.radioGroupItem,
              value === selectedValue ? cx.checked : cx.unchecked,
            )}
          >
            <RadioGroup.Indicator className={cx.radioGroupIndicator} />
          </RadioGroup.Item>
          <label className="Label" htmlFor={value}>
            <Box
              className={cn(cx.label, {
                [cx.disabled]: disabled,
              })}
            >
              {label}
            </Box>
          </label>
        </Flex>
      ))}
    </RadioGroup.Root>
  </Box>
);
