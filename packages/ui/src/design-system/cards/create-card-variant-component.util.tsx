import React from 'react';

import { BaseCard } from './base-card.component';

import type { CardProps } from './base-card.component';
import type { Scheme } from './types';

export type VariantCardProps = Omit<CardProps, 'scheme'>;

export const createCardVariantComponent =
  <Props extends VariantCardProps>(
    scheme: Scheme,
  ): ((props: Readonly<Props>) => JSX.Element) =>
  // eslint-disable-next-line react/display-name
  (props: Readonly<Props>): JSX.Element => (
    <BaseCard {...props} scheme={scheme} />
  );
