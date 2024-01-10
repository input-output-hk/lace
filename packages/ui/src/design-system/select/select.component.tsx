import React from 'react';

import * as Select from '@radix-ui/react-select';
import cn from 'classnames';

import { ReactComponent as ChevronDownIcon } from '../../assets/icons/chevron-down.component.svg';
import { ReactComponent as ChevronUpIcon } from '../../assets/icons/chevron-up.component.svg';
import { Box } from '../box';

import { SelectItem } from './select-item.component';
import * as cx from './select.css';

export type Props = Readonly<{
  className?: string;
  selectedValue: string | undefined;
  placeholder: string;
  options: {
    value: string;
    label: string;
  }[];
  open?: boolean;
  disabled?: boolean;

  onValueChange: (value: string) => void;
}>;

export const SelectGroup = ({
  options,
  className,
  placeholder,
  onValueChange,
  selectedValue,
  ...props
}: Props): JSX.Element => (
  <Box className={cn(className, cx.root)}>
    <Select.Root onValueChange={onValueChange} value={selectedValue} {...props}>
      <Select.Trigger className={cx.selectTrigger} aria-label="Food">
        <Select.Value placeholder={placeholder} />
        <Select.Icon className={cx.selectIcon}>
          <ChevronDownIcon />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content className={cx.selectContent}>
          <Select.ScrollUpButton className={cx.selectScrollButton}>
            <ChevronUpIcon />
          </Select.ScrollUpButton>
          <Select.Viewport className="SelectViewport">
            <Select.Group>
              {options.map(({ label, value }) => {
                return (
                  <SelectItem key={label} value={value}>
                    {label}
                  </SelectItem>
                );
              })}
            </Select.Group>
          </Select.Viewport>
          <Select.ScrollDownButton className={cx.selectScrollButton}>
            <ChevronDownIcon />
          </Select.ScrollDownButton>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  </Box>
);
