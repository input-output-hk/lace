import { createText } from './create-text.util';

type FontWeights = '$bold' | '$medium' | '$regular' | '$semibold';

export const Small = createText<Exclude<FontWeights, '$regular'>>({
  type: 'bodySmall',
  as: 'span',
  weight: '$medium',
});

export const Normal = createText<FontWeights>({
  type: 'body',
  as: 'span',
  weight: '$regular',
});

export const Large = createText<FontWeights>({
  type: 'bodyLarge',
  as: 'span',
  weight: '$regular',
});
