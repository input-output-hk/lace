import { style } from '@vanilla-extract/css';
import { theme } from 'features/theme';

export const delegationCardWrapper = style({
  '@media': {
    '(min-height: 668px)': {
      backgroundColor: theme.colors.$drawerBackgroundColor,
      boxShadow: `10px ${theme.spacing.$24} 10px ${theme.colors.$drawerBackgroundColor}, -10px ${theme.spacing.$24} 10px ${theme.colors.$drawerBackgroundColor}`,
      minWidth: theme.spacing.$584,
      position: 'sticky',
      top: 0,
      zIndex: 1,
    },
  },
});
