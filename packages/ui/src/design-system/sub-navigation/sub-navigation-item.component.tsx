import React from 'react';

import * as Tabs from '@radix-ui/react-tabs';
import classNames from 'classnames';

import { Box } from '../box';
import { Text } from '../text';

import * as cx from './sub-navigation-item.css';

import type { OmitClassName } from '../../types';

type Props = OmitClassName<'span'> & {
  name: string;
  value: string;
  disabled?: boolean;
  highlightWidth?: 'full' | 'half';
};

export const Item = ({
  name,
  value,
  disabled,
  highlightWidth = 'full',
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
    <Box
      className={classNames(cx.highlight, {
        [cx.halfHighlight]: highlightWidth === 'half',
      })}
    />
  </Tabs.Trigger>
);
