import React from 'react';

import { BaseCard } from './base-card.component';

import type { CardProps } from './base-card.component';
import type { Variant } from './types';

export type VariantCardProps = Omit<CardProps, 'variant'>;

export const createCardVariantComponent =
  <Props extends VariantCardProps>(
    variant: Variant,
  ): ((props: Readonly<Props>) => JSX.Element) =>
  // eslint-disable-next-line react/display-name
  (props: Readonly<Props>): JSX.Element =>
    <BaseCard {...props} variant={variant} />;
