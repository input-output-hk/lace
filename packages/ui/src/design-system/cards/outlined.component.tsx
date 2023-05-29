import { createCardVariantComponent } from './create-card-variant-component.util';
import { Variant } from './types';

import type { VariantCardProps } from './create-card-variant-component.util';

export type OutlinedProps = VariantCardProps;

export const Outlined = createCardVariantComponent<OutlinedProps>(
  Variant.Outlined,
);
