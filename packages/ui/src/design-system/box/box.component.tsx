import React from 'react';
import type { PropsWithChildren } from 'react';

import classNames from 'classnames';

import { sx } from '../../design-tokens';

import type { Sx } from '../../design-tokens';

export type BoxProps = Pick<
  Sx,
  | 'h'
  | 'm'
  | 'mb'
  | 'ml'
  | 'mr'
  | 'mt'
  | 'mx'
  | 'my'
  | 'p'
  | 'pb'
  | 'pl'
  | 'pr'
  | 'pt'
  | 'px'
  | 'py'
  | 'w'
> & { className?: string };

export type Props = PropsWithChildren<BoxProps>;

export const Box = ({
  children,
  className,
  h,
  m,
  mb,
  ml,
  mr,
  mt,
  mx,
  my,
  p,
  pb,
  pl,
  pr,
  pt,
  px,
  py,
  w,
  ...props
}: Readonly<Props>): JSX.Element => (
  <div
    {...props}
    className={classNames(
      sx({ h, m, mb, ml, mr, mt, mx, my, p, pb, pl, pr, pt, px, py, w }),
      className,
    )}
  >
    {children}
  </div>
);
