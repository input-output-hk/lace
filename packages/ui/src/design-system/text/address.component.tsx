import { createText } from './create-text.util';

export const Address = createText<'$medium'>({
  type: 'address',
  as: 'span',
  weight: '$medium',
});
