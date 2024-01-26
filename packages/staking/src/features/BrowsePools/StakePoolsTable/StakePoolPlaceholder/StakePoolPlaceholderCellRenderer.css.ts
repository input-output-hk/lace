// TODO: remove once replaced with new pool skeleton (LW-9659)
import { style, sx } from '@lace/ui';
import { theme } from 'features/theme';

export const cellPlaceholder = style([
  sx({
    borderRadius: '$medium',
    width: '$fill',
  }),
  {
    background: theme.colors.$stakePoolCellPlaceholder,
    height: '15px',
  },
]);
