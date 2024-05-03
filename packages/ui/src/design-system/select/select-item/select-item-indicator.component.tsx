import React, { forwardRef } from 'react';

import { ReactComponent as CheckIcon } from '@lace/icons/dist/CheckComponent';
import * as Select from '@radix-ui/react-select';

import * as cx from './select-item-indicator.css';

/**
 * https://www.radix-ui.com/primitives/docs/components/select#itemindicator
 */
export const ItemIndicator = forwardRef<HTMLSpanElement>(
  (_, forwardReference) => (
    <Select.ItemIndicator ref={forwardReference} className={cx.indicator}>
      <CheckIcon />
    </Select.ItemIndicator>
  ),
);

// eslint-disable-next-line functional/immutable-data
ItemIndicator.displayName = 'ItemIndicator';
