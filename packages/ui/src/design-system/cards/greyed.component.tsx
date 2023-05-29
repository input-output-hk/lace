import { createCardVariantComponent } from './create-card-variant-component.util';
import { Variant } from './types';

import type { VariantCardProps } from './create-card-variant-component.util';

export type GreyedProps = VariantCardProps;

export const Greyed = createCardVariantComponent<GreyedProps>(Variant.Greyed);
