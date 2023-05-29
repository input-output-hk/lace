import type { PropsWithChildren, HTMLAttributes } from 'react';
import React from 'react';

import cs from 'classnames';

import * as cx from './base-card.css';

import type { Variant } from './types';

export type CardProps = PropsWithChildren<
  HTMLAttributes<HTMLDivElement> & {
    variant: `${Variant}`;
  }
>;

export const BaseCard = ({
  children,
  className,
  variant,
  ...restProps
}: Readonly<CardProps>): JSX.Element => (
  <div
    {...restProps}
    className={cs(className, cx.card({ variant: variant as Variant }))}
  >
    {children}
  </div>
);
