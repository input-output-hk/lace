import { createText } from './create-text.util';

export const Heading = createText<'$bold'>({
  type: 'heading',
  as: 'h1',
  weight: '$bold',
});
