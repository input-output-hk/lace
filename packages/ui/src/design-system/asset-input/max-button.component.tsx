import React from 'react';

import classNames from 'classnames';

import { Text } from '../text';

import * as cx from './max-button.css';

import type { OmitClassName } from '../../types';

export type Props = OmitClassName<'button'> & {
  label?: string;
};

export const MaxButton = ({
  label,
  ...props
}: Readonly<Props>): JSX.Element => (
  <button {...props} className={classNames(cx.container, cx.button)}>
    <Text.Label color="secondary" className={cx.label}>
      {label}
    </Text.Label>
  </button>
);
