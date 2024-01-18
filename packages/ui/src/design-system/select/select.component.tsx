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

  onValueChange: (value: string) => void;
}>;

export const SelectGroup = ({
  options,
  className,
  placeholder,
  onValueChange,
  selectedValue,
  showArrow = false,
  ...props
}: Props): JSX.Element => (
  <Box className={cn(className, cx.root)}>
    <RadixSelectGroup.Root
      onValueChange={onValueChange}
      value={selectedValue}
      {...props}
    >
      <RadixSelectGroup.Trigger className={cx.selectTrigger} aria-label="Food">
        <RadixSelectGroup.Value placeholder={placeholder} />
        {showArrow && (
          <RadixSelectGroup.Icon className={cx.selectIcon}>
            <ChevronDownIcon />
          </RadixSelectGroup.Icon>
        )}
      </RadixSelectGroup.Trigger>
      <RadixSelectGroup.Portal>
        <RadixSelectGroup.Content className={cx.selectContent}>
          <RadixSelectGroup.Viewport className="SelectViewport">
            <RadixSelectGroup.Group>
              {options.map(({ label, value }) => {
                return (
                  <SelectItem key={label} value={value}>
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
