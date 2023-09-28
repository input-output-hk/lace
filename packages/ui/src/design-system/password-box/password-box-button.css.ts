import { globalStyle, style, sx, vars } from '../../design-tokens';

export const inputButton = style([
  sx({
    width: '$52',
    height: '$52',
    borderRadius: '$extraSmall',
  }),
  {
    background: vars.colors.$input_button_bgColor,
    border: 'none',
    marginLeft: `-60px`,
    cursor: 'pointer',
    flex: 'none',

    ':disabled': {
      cursor: 'default',
    },
  },
]);

export const disabledInputButtonIcon = style({
  opacity: vars.opacities.$0_24,
});

export const inputButtonIcon = style({
  width: vars.spacing.$24,
  height: vars.spacing.$24,
});

globalStyle(`${inputButtonIcon} path`, {
  stroke: vars.colors.$input_button_icon_color,
});
