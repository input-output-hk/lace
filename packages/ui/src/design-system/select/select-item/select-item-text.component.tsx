import React, { forwardRef } from 'react';

import * as Select from '@radix-ui/react-select';

import { Flex } from '../../flex';
import { Text } from '../../text';

export interface SelectItemTitleProps {
  title: string;
  description?: string;
}

/**
 * @param title Item title that will be displayed in the trigger/container after when this item is selected.
 * @param [description] Item description, visible only when input is in `open` state.
 */
export const ItemText = forwardRef<HTMLSpanElement, SelectItemTitleProps>(
  ({ title, description }, forwardReference) => (
    <Flex flexDirection="row" alignItems="center" gap="$24">
      {/* Please do not attempt to use our <Text.* /> component. Radix forbids the styling of ItemText.
      See: https://www.radix-ui.com/primitives/docs/components/select#itemtext */}
      <Select.ItemText ref={forwardReference}>{title}</Select.ItemText>
      {Boolean(description) && <Text.Body.Large>{description}</Text.Body.Large>}
    </Flex>
  ),
);

// eslint-disable-next-line functional/immutable-data
ItemText.displayName = 'ItemTitle';
