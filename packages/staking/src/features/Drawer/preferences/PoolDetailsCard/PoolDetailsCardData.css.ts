import { style } from '@vanilla-extract/css';
import { sx } from 'features/theme';

export const root = style([
  sx({
    borderColor: '$preferencesPoolCardBorderColor',
  }),
  {
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderStyle: 'solid',
    borderWidth: 1,
  },
]);

export const valueBox = style([
  sx({
    borderRightColor: '$preferencesPoolCardBorderColor',
    paddingBottom: '$20',
    paddingTop: '$16',
  }),
  {
    ':last-of-type': {
      borderRightWidth: 0,
    },
    borderRightStyle: 'solid',
    borderRightWidth: 1,
    flexGrow: 1,
  },
]);

export const valueLabel = sx({
  color: '$preferencesPoolCardDataTextColor',
});

export const valueInfoIcon = style([
  sx({
    color: '$preferencesPoolCardDataIconColor',
    marginLeft: '$8',
  }),
  {
    fontSize: 24,
  },
]);
