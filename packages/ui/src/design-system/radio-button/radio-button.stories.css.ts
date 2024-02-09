import { style, vars } from '../../design-tokens';

export const focus = style({
  padding: 4,
  outline: `3px solid ${vars.colors.$input_container_focused_outline_color}`,
});
