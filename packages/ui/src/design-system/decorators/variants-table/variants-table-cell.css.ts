import { style, sx } from '../../../design-tokens';

import { border } from './variants-table.css';

export const cell = style([
  border,
  sx({ height: '$64', px: '$24', py: '$40' }),
  {
    textAlign: 'left',
  },
]);
