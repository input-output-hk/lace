import { createText } from './create-text.util';

export const PageHeading = createText<'$bold'>({
  type: 'pageHeading',
  as: 'h1',
  weight: '$bold',
});
