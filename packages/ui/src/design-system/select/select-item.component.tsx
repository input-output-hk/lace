import React from 'react';

import * as Select from '@radix-ui/react-select';

import * as cx from './select.css';

type Props = Readonly<{
  children: React.ReactNode;
  className?: string;
  value: string;
}>;

const SelectItemComponent = (
  { children, value, ...props }: Props,
  forwardedReference: React.Ref<HTMLDivElement>,
): JSX.Element => {
  return (
    <Select.Item
      className={cx.selectItem}
      {...props}
      value={value}
      ref={forwardedReference}
    >
      <Select.ItemText>{children}</Select.ItemText>
    </Select.Item>
  );
};

export const SelectItem = React.forwardRef(SelectItemComponent);
