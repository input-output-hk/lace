import { style } from '@vanilla-extract/css';
import { theme } from '../../theme';

export const bannerInfoIcon = style({
  color: theme.colors.$bannerInfoIconColor,
});

export const bannerBellIcon = style({
  color: theme.colors.$bannerBellIconColor,
});

export const bannerContainer = style({
  width: '100%',
});
