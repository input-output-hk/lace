import React from 'react';

import { ReactComponent as ChevronDownIcon } from '@lace/icons/dist/ChevronDownComponent';
import { ReactComponent as ChevronUpIcon } from '@lace/icons/dist/ChevronUpComponent';
import * as Select from '@radix-ui/react-select';
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
      </Select.Trigger>
      <Select.Portal>
        <Select.Content className={cx.selectContent}>
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
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  </Box>
);
