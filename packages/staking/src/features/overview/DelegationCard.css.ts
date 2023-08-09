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
  position: 'relative',
  width: 148,
});

export const counter = style({
  left: '50%',
  position: 'absolute',
  top: '50%',
  transform: 'translate(-50%, -50%)',
});

export const info = style({
  // TODO: change to 300 according to designs
  width: 400,
});

export const infoLabel = style({
  color: theme.colors.$delegationCardInfoLabelColor,
});

export const infoValue = style({
  color: theme.colors.$delegationCardInfoValueColor,
  textAlign: 'right',
});
