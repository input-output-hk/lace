import { lightColorScheme, style } from '../../design-tokens';

export const note = style({
  color: lightColorScheme.$primary_dark_grey_plus,
});

export const radioGroupWithIcon = style({
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'flex-start',
  alignItems: 'stretch',
});

export const withIconWrapper = style({
  width: 194,
});
