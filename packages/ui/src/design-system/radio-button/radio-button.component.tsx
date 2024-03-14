import React from 'react';

import * as RadixRadioGroup from '@radix-ui/react-radio-group';
import cn from 'classnames';

import { Button } from '..';
import { Box } from '../box';
import { Flex } from '../flex';
import { Tooltip } from '../tooltip';

import * as cx from './radio-button.css';

export interface RadioButtonGroupOption {
  value: string;
  label: string;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  onIconClick?: () => void;
  tooltipText?: string;
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
        className={cx.radioGroupRoot[hasIcon ? 'withIcon' : 'default']}
      >
        {options.map(
          ({ value, label, icon: Icon, onIconClick, tooltipText = '' }) => {
            const hasLabel = !!label;
            const labelContent = hasLabel && (
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
            );

            return (
              <Flex
                alignItems="center"
                key={value}
                className={cn(
                  cx.radioGroupItemWrapper[hasLabel ? 'withLabel' : 'default'],
                  {
                    [cx.withIcon]: hasIcon,
                  },
                )}
              >
                <RadixRadioGroup.Item
                  id={`radio-btn-control-id-${value}`}
                  value={value}
                  className={cx.radioGroupItem}
                >
                  <RadixRadioGroup.Indicator
                    className={cx.radioGroupIndicator}
                  />
                </RadixRadioGroup.Item>
                {tooltipText ? (
                  <Tooltip label={tooltipText} delayDuration={800}>
                    {labelContent}
                  </Tooltip>
                ) : (
                  labelContent
                )}
                {Icon !== undefined && value === selectedValue && (
                  <Flex justifyContent="flex-end" className={cx.iconWrapper}>
                    <button
                      className={cx.iconButton}
                      disabled={disabled}
                      onClick={onIconClick}
                    >
                      <Icon />
                    </button>
                  </Flex>
                )}
              </Flex>
            );
          },
        )}
      </RadixRadioGroup.Root>
    </Box>
  );
};
