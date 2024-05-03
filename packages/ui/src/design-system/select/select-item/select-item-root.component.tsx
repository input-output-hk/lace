import React, { forwardRef } from 'react';

import * as Select from '@radix-ui/react-select';

import * as cx from './select-item-root.component.css';

import type { SelectItemPrivateProps } from './types';
import type { SelectItemProps } from '@radix-ui/react-select';

export type SelectItemRootProps = Pick<
  SelectItemProps,
  'children' | 'disabled' | 'value'
> & {
  testId?: string;
};

/**
 * https://www.radix-ui.com/primitives/docs/components/select#item
 */
export const ItemRoot = forwardRef<
  HTMLDivElement,
  SelectItemPrivateProps & SelectItemRootProps
>(
  (
    { children, disabled, value, variant = 'plain', testId },
    forwardReference,
  ) => (
    <Select.Item
      ref={forwardReference}
      disabled={disabled}
      value={value}
      className={cx.root[variant]}
      data-testid={testId}
    >
      {children}
    </Select.Item>
  ),
);

// eslint-disable-next-line functional/immutable-data
ItemRoot.displayName = 'ItemRoot';
