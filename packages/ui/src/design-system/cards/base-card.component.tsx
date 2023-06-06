import type { PropsWithChildren, HTMLAttributes } from 'react';
import React from 'react';

import cs from 'classnames';

import * as cx from './base-card.css';

import type { Scheme } from './types';

export type CardProps = PropsWithChildren<
  HTMLAttributes<HTMLDivElement> & {
    scheme: `${Scheme}`;
  }
>;

export const BaseCard = ({
  children,
  className,
  scheme,
  ...restProps
}: Readonly<CardProps>): JSX.Element => (
  <div
    {...restProps}
    className={cs(className, cx.card({ scheme: scheme as Scheme }))}
  >
    {children}
  </div>
);
