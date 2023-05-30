import React from 'react';

import * as Tabs from '@radix-ui/react-tabs';
import classNames from 'classnames';

import { Box } from '../box';
import * as Text from '../typography';

import * as cx from './sub-navigation-item.css';

import type { OmitClassName } from '../../types';

type Props = OmitClassName<HTMLSpanElement> & {
  name: string;
  value: string;
  disabled?: boolean;
};

export const Item = ({
  name,
  value,
  disabled,
  ...props
}: Readonly<Props>): JSX.Element => (
  <Tabs.Trigger
    className={classNames(cx.root, cx.container, cx.trigger, {
      [cx.disabled]: disabled,
    })}
    value={value}
    {...props}
  >
    <Box className={cx.labelContainer}>
      <Text.Button className={cx.label}>{name}</Text.Button>
    </Box>
    <Box className={cx.highlight} />
  </Tabs.Trigger>
);
