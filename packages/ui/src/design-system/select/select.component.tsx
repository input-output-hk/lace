import React from 'react';

import { ReactComponent as ChevronDownIcon } from '@lace/icons/dist/ChevronDownComponent';
import * as RadixSelectGroup from '@radix-ui/react-select';
import cn from 'classnames';

import { Box } from '../box';

import { SelectItem } from './select-item.component';
import * as cx from './select.css';

export type Props = Readonly<{
  className?: string;
  selectedValue?: string;
  placeholder: string;
  options: {
    value: string;
    label: string;
  }[];
  open?: boolean;
  disabled?: boolean;
  showArrow?: boolean;
  withOutline?: boolean;
  onValueChange: (value: string) => void;
  contentClassName?: string;
}>;

export const SelectGroup = ({
  options,
  className,
  placeholder,
  onValueChange,
  selectedValue,
  showArrow = false,
  withOutline = false,
  contentClassName,
  ...props
}: Props): JSX.Element => (
  <Box className={cn(className, cx.root)}>
    <RadixSelectGroup.Root
      onValueChange={onValueChange}
      value={selectedValue}
      {...props}
    >
      <RadixSelectGroup.Trigger
        className={
          cx.selectTriggerVariants[withOutline ? 'outlined' : 'notOutlined']
        }
        aria-label="Food"
        data-testid="select-group-input"
      >
        <RadixSelectGroup.Value placeholder={placeholder} />
        {showArrow && (
          <RadixSelectGroup.Icon className={cx.selectIcon}>
            <ChevronDownIcon />
          </RadixSelectGroup.Icon>
        )}
      </RadixSelectGroup.Trigger>
      <RadixSelectGroup.Portal>
        <RadixSelectGroup.Content
          className={cn(cx.selectContent, contentClassName)}
        >
          <RadixSelectGroup.Viewport className="SelectViewport">
            <RadixSelectGroup.Group>
              {options.map(({ label, value }) => {
                return (
                  <SelectItem
                    key={label}
                    value={value}
                    data-testid="select-group-option"
                  >
                    {label}
                  </SelectItem>
                );
              })}
            </RadixSelectGroup.Group>
          </RadixSelectGroup.Viewport>
        </RadixSelectGroup.Content>
      </RadixSelectGroup.Portal>
    </RadixSelectGroup.Root>
  </Box>
);
