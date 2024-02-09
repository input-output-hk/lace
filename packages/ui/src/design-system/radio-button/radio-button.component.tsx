import React from 'react';

import * as RadixRadioGroup from '@radix-ui/react-radio-group';
import cn from 'classnames';

import * as Text from '../../design-system/typography';
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
}: Props): JSX.Element => {
  const hasIcon = options.some(opx => Boolean(opx.icon));

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
        {options.map(({ value, label, icon, onIconClick }) => (
          <Flex
            h="$fill"
            alignItems={'center'}
            key={value}
            className={cn({
              [cx.withIcon]: hasIcon,
              [cx.disabled]: disabled,
            })}
          >
            <RadixRadioGroup.Item
              id={label}
              value={value}
              className={cn(cx.radioGroupItem, {
                [cx.withLabel]: !!label,
              })}
            >
              <Flex
                className={cn(cx.indicatorWrapper, {
                  [cx.checked]: value === selectedValue,
                  [cx.unchecked]: value !== selectedValue,
                })}
              >
                <RadixRadioGroup.Indicator className={cx.radioGroupIndicator} />
              </Flex>
              {label && (
                <label id="Label" htmlFor={value}>
                  <Box className={cn(cx.label)}>
                    <Text.Body.Large weight="$medium">{label}</Text.Body.Large>
                  </Box>
                </label>
              )}
            </RadixRadioGroup.Item>

            {!!icon && (
              <Flex className={cx.iconWrapper}>
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
