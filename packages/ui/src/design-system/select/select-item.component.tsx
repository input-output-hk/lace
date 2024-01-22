import React from 'react';

import * as RadixSelectGroup from '@radix-ui/react-select';

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
    <RadixSelectGroup.Item
      className={cx.selectItem}
      {...props}
      value={value}
      ref={forwardedReference}
    >
      <RadixSelectGroup.ItemText>{children}</RadixSelectGroup.ItemText>
    </RadixSelectGroup.Item>
  );
};

export const SelectItem = React.forwardRef(SelectItemComponent);
