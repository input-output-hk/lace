import React from 'react';

import * as RadixRadioGroup from '@radix-ui/react-radio-group';
import cn from 'classnames';

import { Box } from '../box';
import { Flex } from '../flex';

import * as cx from './radio-button.css';

export interface RadioButtonGroupOption {
  value: string;
  label: React.ReactNode;
  icon?: JSX.Element;
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
  return (
    <Box className={cn(className, cx.root)}>
      <RadixRadioGroup.Root
        {...props}
        value={selectedValue}
        disabled={disabled}
        onValueChange={onValueChange}
        className={cx.radioGroupRoot}
      >
        {options.map(({ value, label, icon: Icon, onIconClick }) => {
          const hasLabel = Boolean(label);

          return (
            <Flex
              alignItems="center"
              className={cx.radioGroupItemWrapper}
              key={value}
            >
              <Flex
                alignItems="center"
                className={
                  cx.radioGroupItem[hasLabel ? 'withLabel' : 'default']
                }
              >
                <RadixRadioGroup.Item
                  id={`radio-btn-control-id-${value}`}
                  value={value}
                  className={cx.radioGroupIndicatorWrapper}
                  data-testid={`radio-btn-test-id-${value}`}
                >
                  <RadixRadioGroup.Indicator
                    className={cx.radioGroupIndicator}
                  />
                </RadixRadioGroup.Item>
                {hasLabel && (
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
                    <button
                      className={cx.iconButton}
                      disabled={disabled}
                      onClick={onIconClick}
                      tabIndex={-1}
                      id={`radio-btn-sorting-id-${value}`}
                    >
                      {Icon}
                    </button>
                  </Flex>
                )}
              </Flex>
            </Flex>
          );
        })}
      </RadixRadioGroup.Root>
    </Box>
  );
};
