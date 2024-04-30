import { createText } from './create-text.util';

export const SubHeading = createText<'$bold' | '$semibold'>({
  type: 'subHeading',
  as: 'h2',
  weight: '$semibold',
});
