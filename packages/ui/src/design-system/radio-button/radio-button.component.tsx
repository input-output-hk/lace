import React from 'react';

import * as RadixRadioGroup from '@radix-ui/react-radio-group';
import cn from 'classnames';

import { Box } from '../box';
import { Flex } from '../flex';

import * as cx from './radio-button.css';

export type Props = Readonly<{
  disabled?: boolean;
  className?: string;
  selectedValue: string;

  options: {
    value: string;
    label: string;
    icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;

    onIconClick?: () => void;
  }[];

  onValueChange: (value: string) => void;
}>;

export const RadioButtonGroup = ({
  disabled = false,
  onValueChange,
  className,
  selectedValue,
  options,
  ...props
}: Props): JSX.Element => (
  <Box className={cn(className, cx.root)}>
    <RadixRadioGroup.Root
      {...props}
      value={selectedValue}
      disabled={disabled}
      onValueChange={onValueChange}
      className={cx.radioGroupRoot}
    >
      {options.map(({ value, label, icon, onIconClick }) => (
        <Flex alignItems="center" h="$fill" m="$4" key={value}>
          <RadixRadioGroup.Item
            id={label}
            value={value}
            className={cn(
              cx.radioGroupItem,
              value === selectedValue ? cx.checked : cx.unchecked,
            )}
          >
            <RadixRadioGroup.Indicator className={cx.radioGroupIndicator} />
          </RadixRadioGroup.Item>
          {label && (
            <label className="Label" htmlFor={value}>
              <Box
                className={cn(cx.label, {
                  [cx.disabled]: disabled,
                })}
              >
                {label}
              </Box>
            </label>
          )}
          {icon !== undefined && value === selectedValue && (
            <Flex justifyContent="flex-end">
              <div className={cx.icon} onClick={onIconClick}>
                {React.createElement(icon)}
              </div>
            </Flex>
          )}
        </Flex>
      ))}
    </RadixRadioGroup.Root>
  </Box>
);
