import { style } from '@vanilla-extract/css';
import { sx, theme } from 'features/theme';

export const inputContainer = style([
  sx({
    background: '$ratioInputContainerBgColor',
    borderRadius: '$medium',
    height: '$48',
    width: '$48',
  }),
  {
    ':hover': {
      outline: `2px solid ${theme.colors.$ratioInputContainerHoverOutlineColor}`,
    },
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'center',
  },
]);

export const input = style([
  sx({
    color: '$ratioInputValueColor',
    fontFamily: '$nova',
    fontSize: '$18',
    fontWeight: '$semibold',
  }),
  {
    ':disabled': {
      opacity: theme.opacities.$0_5,
    },
    background: 'transparent',
    border: 'none',
    outline: 'none',
    textAlign: 'center',
    width: '100%',
  },
]);
