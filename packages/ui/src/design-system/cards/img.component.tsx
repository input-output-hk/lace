import { createCardVariantComponent } from './create-card-variant-component.util';
import { Scheme } from './types';

import type { VariantCardProps } from './create-card-variant-component.util';

export type ElevatedProps = VariantCardProps;

export const Img = createCardVariantComponent<ElevatedProps>(Scheme.Img);
