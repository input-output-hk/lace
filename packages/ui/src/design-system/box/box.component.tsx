import React, { forwardRef } from 'react';
import type { CSSProperties, PropsWithChildren, Ref } from 'react';

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
> & { className?: string; style?: CSSProperties };

export type Props = PropsWithChildren<BoxProps>;

const PureBox = (
  {
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
  }: Readonly<Props>,
  ref?: Ref<HTMLDivElement>,
): JSX.Element => (
  <div
    {...props}
    className={classNames(
      sx({ h, m, mb, ml, mr, mt, mx, my, p, pb, pl, pr, pt, px, py, w }),
      className,
    )}
    ref={ref}
  >
    {children}
  </div>
);

export const Box = forwardRef(PureBox);
