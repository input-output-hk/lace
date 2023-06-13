import { createCardVariantComponent } from './create-card-variant-component.util';
import { Scheme } from './types';

import type { VariantCardProps } from './create-card-variant-component.util';

export type ElevatedProps = VariantCardProps;

export const Elevated = createCardVariantComponent<ElevatedProps>(
  Scheme.Elevated,
);
