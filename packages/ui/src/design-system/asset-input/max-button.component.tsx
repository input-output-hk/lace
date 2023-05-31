import React from 'react';

import classNames from 'classnames';

import * as Text from '../typography';

import * as cx from './max-button.css';

import type { OmitClassName } from '../../types';

export type Props = OmitClassName<HTMLButtonElement> & {
  label?: string;
};

export const MaxButton = ({
  label,
  ...props
}: Readonly<Props>): JSX.Element => (
  <button {...props} className={classNames(cx.container, cx.button)}>
    <Text.Label className={cx.label}>{label}</Text.Label>
  </button>
);
