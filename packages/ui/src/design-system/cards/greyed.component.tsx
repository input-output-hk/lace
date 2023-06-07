import { createCardVariantComponent } from './create-card-variant-component.util';
import { Scheme } from './types';

import type { VariantCardProps } from './create-card-variant-component.util';

export type GreyedProps = VariantCardProps;

export const Greyed = createCardVariantComponent<GreyedProps>(Scheme.Greyed);
