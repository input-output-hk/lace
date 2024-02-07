import { style, vars } from '../../design-tokens';

export const focus = style({
  boxShadow: `0px 0px 0px 3px ${vars.colors.$radiobutton_focus_color}`,
});

export const radioGroup = style({
  width: '100%',
});
