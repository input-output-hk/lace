import React from 'react';

import * as RadixRadioGroup from '@radix-ui/react-radio-group';
import cn from 'classnames';

import { Box } from '../box';
import { Flex } from '../flex';

import * as cx from './radio-button.css';

export interface RadioButtonGroupOption {
  value: string;
  label: string;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  onIconClick?: () => void;
}

export interface RadioButtonGroupProps {
  disabled?: boolean;
  className?: string;
  selectedValue: string;
  options: RadioButtonGroupOption[];
  onValueChange: (value: string) => void;
}

export const RadioButtonGroup = ({
  disabled = false,
  onValueChange,
  className,
  selectedValue,
  options,
  ...props
}: Readonly<RadioButtonGroupProps>): JSX.Element => {
  const hasIcon = options.some(({ icon }) => Boolean(icon));

  return (
    <Box className={cn(className, cx.root)}>
      <RadixRadioGroup.Root
        {...props}
        value={selectedValue}
        disabled={disabled}
        onValueChange={onValueChange}
        className={cn(cx.radioGroupRoot, {
          [cx.gap]: !hasIcon,
        })}
      >
        {options.map(({ value, label, icon: Icon, onIconClick }) => (
          <Flex
            h="$fill"
            alignItems={'center'}
            key={value}
            className={cn({ [cx.withIcon]: hasIcon })}
          >
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
              <label id="Label" htmlFor={value}>
                <Box
                  className={cn(cx.label, {
                    [cx.disabled]: disabled,
                  })}
                >
                  {label}
                </Box>
              </label>
            )}
            {Icon !== undefined && value === selectedValue && (
              <Flex justifyContent="flex-end">
                <div className={cx.icon} onClick={onIconClick}>
                  <Icon />
                </div>
              </Flex>
            )}
          </Flex>
        ))}
      </RadixRadioGroup.Root>
    </Box>
  );
};
