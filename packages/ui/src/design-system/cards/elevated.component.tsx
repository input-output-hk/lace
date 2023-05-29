import { createCardVariantComponent } from './create-card-variant-component.util';
import { Variant } from './types';

import type { VariantCardProps } from './create-card-variant-component.util';

export type ElevatedProps = VariantCardProps;

export const Elevated = createCardVariantComponent<ElevatedProps>(
  Variant.Elevated,
);
