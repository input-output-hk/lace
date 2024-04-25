import { createText } from './create-text.util';

export const Button = createText<'$semibold'>({
  type: 'button',
  as: 'span',
  weight: '$semibold',
});
