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
  selectedValue?: string;
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
        className={cx.radioGroupRootWithIcon[hasIcon ? 'withIcon' : 'default']}
      >
        {options.map(({ value, label, icon: Icon, onIconClick }) => (
          <Flex
            alignItems="center"
            key={value}
            className={cn({
              [`${cx.radioGroupItemWrapper} ${cx.radioGroupItemWrapperSelector}`]:
                !!label,
              [cx.withIcon]: hasIcon,
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
            {Icon !== undefined && value === selectedValue && (
              <Flex justifyContent="flex-end" className={cx.iconWrapper}>
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
