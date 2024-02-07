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
    icon?: React.ReactNode;
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
}: Props): JSX.Element => {
  const isAnyOptionHasIcon = options.some(opx => Boolean(opx.icon));

  return (
    <Box className={cn(className, cx.root)}>
      <RadixRadioGroup.Root
        {...props}
        value={selectedValue}
        disabled={disabled}
        onValueChange={onValueChange}
        className={cn(cx.radioGroupRoot, {
          [cx.gap]: !isAnyOptionHasIcon,
        })}
      >
        {options.map(({ value, label, icon, onIconClick }) => (
          <Flex
            h="$fill"
            alignItems={'center'}
            key={value}
            className={cn(isAnyOptionHasIcon && cx.withIcon)}
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
            {icon !== undefined && (
              <Flex justifyContent="flex-end" className={cx.iconWrapper}>
                {value === selectedValue && (
                  <div className={cx.icon} onClick={onIconClick}>
                    {icon}
                  </div>
                )}
              </Flex>
            )}
          </Flex>
        ))}
      </RadixRadioGroup.Root>
    </Box>
  );
};
