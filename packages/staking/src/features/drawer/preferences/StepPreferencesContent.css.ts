import { style } from '@lace/ui';
import { theme } from '../../theme';

export const delegationCardWrapper = style({
  '@media': {
    '(min-height: 668px)': {
      backgroundColor: theme.colors.$drawerBackgroundColor,
      minWidth: theme.spacing.$584,
      position: 'sticky',
      top: 0,
      zIndex: 1,
    },
  },
});
