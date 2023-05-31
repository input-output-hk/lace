import { createText } from './create-text.util';

export const Display = createText<'$bold'>({
  type: 'display',
  as: 'h1',
  weight: '$bold',
});
