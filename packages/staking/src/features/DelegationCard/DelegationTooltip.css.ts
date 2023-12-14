import { style } from '@vanilla-extract/css';
import { theme } from '../theme';

export const tooltip = style({
  background: theme.colors.$tooltipBgColor,
  borderRadius: theme.radius.$small,
  boxShadow: theme.elevation.$tooltip,
  margin: theme.spacing.$10,
  maxWidth: theme.spacing.$214,
  padding: theme.spacing.$16,
});
