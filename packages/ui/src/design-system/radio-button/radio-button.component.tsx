import React from 'react';

import * as RadixRadioGroup from '@radix-ui/react-radio-group';
import cn from 'classnames';

import { Box } from '../box';
import { Flex } from '../flex';

import * as cx from './radio-button.css';

export type Props = Readonly<{
  disabled?: boolean;
  className?: string;
  selectedValue?: string;

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
        <Flex
          alignItems="center"
          m="$4"
          key={value}
          className={cn({
            [`${cx.radioGroupItemWrapper} ${cx.radioGroupItemWrapperSelector}`]:
              !!label,
          })}
        >
          <RadixRadioGroup.Item
            id={`radio-btn-control-id-${value}`}
            value={value}
            className={cx.radioGroupItem}
          >
            <RadixRadioGroup.Indicator className={cx.radioGroupIndicator} />
          </RadixRadioGroup.Item>
          {label && (
            <label
              id={`radio-btn-label-id-${value}`}
              htmlFor={`radio-btn-control-id-${value}`}
            >
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
