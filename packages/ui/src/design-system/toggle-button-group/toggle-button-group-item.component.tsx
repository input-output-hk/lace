import React, { forwardRef } from 'react';

import * as ToggleGroup from '@radix-ui/react-toggle-group';
import cn from 'classnames';

import { Text } from '../text';

import * as cx from './toggle-button-group-item.css';

import type { ToggleGroupItemProps } from '@radix-ui/react-toggle-group';

export type ToggleButtonGroupItemProps = Pick<
  ToggleGroupItemProps,
  'children' | 'disabled' | 'id' | 'value'
> & {
  icon?: React.FC<React.SVGProps<SVGSVGElement>>;
};

export const Item = forwardRef<HTMLButtonElement, ToggleButtonGroupItemProps>(
  (
    { icon: IconComponent, children, ...props },
    forwardReference,
  ): JSX.Element => (
    <ToggleGroup.Item
      className={cn(cx.root, cx.rootHandle)}
      ref={forwardReference}
      {...props}
    >
      {IconComponent && <IconComponent className={cx.icon} />}
      {Boolean(children) && (
        <Text.Button weight="$semibold" className={cx.label}>
          {children}
        </Text.Button>
      )}
    </ToggleGroup.Item>
  ),
);
// eslint-disable-next-line functional/immutable-data
Item.displayName = 'Item';
