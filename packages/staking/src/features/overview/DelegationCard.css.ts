import { style } from '@vanilla-extract/css';
import { theme } from '../theme';

export const content = style({
  alignItems: 'center',
  display: 'flex',
  flexDirection: 'row',
  height: 195,
  justifyContent: 'space-around',
});

export const chart = style({
  width: 148,
});

export const info = style({
  width: 300,
});

export const infoLabel = style({
  color: theme.colors.$delegationCardInfoLabelColor,
});

export const infoValue = style({
  color: theme.colors.$delegationCardInfoValueColor,
  textAlign: 'right',
});
