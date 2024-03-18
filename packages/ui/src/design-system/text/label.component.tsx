import { createText } from './create-text.util';

export const Label = createText<'$medium'>({
  type: 'formLabel',
  as: 'span',
  weight: '$medium',
});
