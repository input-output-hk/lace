import type { PropsWithChildren, HTMLAttributes } from 'react';
import React from 'react';

import cs from 'classnames';

import * as cx from './address-tag.css';

import type { AddressTagVariants } from './types';

export type AddressBaseTageProps = PropsWithChildren<
  HTMLAttributes<HTMLDivElement> & {
    variant: AddressTagVariants;
    testId?: string;
  }
>;

export const AddressTag = ({
  children,
  className,
  variant,
  testId = 'address-tag',
  ...restProps
}: Readonly<AddressBaseTageProps>): JSX.Element => (
  <div
    {...restProps}
    data-testid={testId}
    className={cs(className, cx.addressTag({ scheme: variant }))}
  >
    {children}
  </div>
);
