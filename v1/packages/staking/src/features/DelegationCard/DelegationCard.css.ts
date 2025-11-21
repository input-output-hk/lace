import { style } from '@vanilla-extract/css';
import { theme } from '../theme';

export const content = style({
  alignItems: 'center',
  display: 'flex',
  justifyContent: 'space-around',
  padding: theme.spacing.$32,
});

export const contentHorizontal = style({
  flexDirection: 'row',
  gap: theme.spacing.$32,
  height: 195,
});

export const contentVertical = style({
  flexDirection: 'column',
  gap: theme.spacing.$32,
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

export const infoHorizontal = style({
  width: 300,
});

export const infoVertical = style({
  width: '100%',
});

export const infoLabel = style({
  color: theme.colors.$delegationCardInfoLabelColor,
});

export const infoValue = style({
  color: theme.colors.$delegationCardInfoValueColor,
  textAlign: 'right',
});

export const warningValue = style({
  color: theme.colors.$delegationCardWarningValueColor,
  textAlign: 'right',
});
