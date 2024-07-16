import { style } from '@vanilla-extract/css';
import { sx } from 'features/theme';

export const container = style({
  alignItems: 'center',
  display: 'flex',
  flexDirection: 'column',
});

export const icon = style({
  fontSize: 112,
});

export const text = sx({
  color: '$preferencesDrawerNoPoolsTextColor',
});
