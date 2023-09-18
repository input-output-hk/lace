import React from 'react';
import type { ReactElement } from 'react';

import * as Tabs from '@radix-ui/react-tabs';

import * as cx from './sub-navigation.css';

import type { Item } from './sub-navigation-item.component';
import type { OmitClassName } from '../../types';

export type SubNavigationRootProps = OmitClassName<typeof Tabs.List> & {
  defaultValue?: string;
  children: ReactElement<typeof Item> | ReactElement<typeof Item>[];
  onValueChange?: (value: string) => void;
  value?: string;
};

export const SubNavigation = ({
  children,
  defaultValue,
  onValueChange,
  value,
  ...props
}: Readonly<SubNavigationRootProps>): JSX.Element => (
  <Tabs.Root
    className={cx.root}
    defaultValue={defaultValue}
    value={value}
    onValueChange={onValueChange}
    activationMode="manual"
  >
    <Tabs.List {...props}>{children}</Tabs.List>
  </Tabs.Root>
);
