import type { PropsWithChildren, HTMLAttributes } from 'react';
import React from 'react';

import cs from 'classnames';

import * as cx from './address-tag.css';

import type { AddressTagScheme } from './types';

export type AddressBaseTageProps = PropsWithChildren<
  HTMLAttributes<HTMLDivElement> & {
    variant: AddressTagScheme;
  }
>;

export const AddressTag = ({
  children,
  className,
  variant,
  ...restProps
}: Readonly<AddressBaseTageProps>): JSX.Element => (
  <div {...restProps} className={cs(className, cx.card({ scheme: variant }))}>
    {children}
  </div>
);
