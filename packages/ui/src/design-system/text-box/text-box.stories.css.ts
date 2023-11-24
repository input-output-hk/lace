import { style, vars } from '../../design-tokens';

export const hoverEffect = style({
  outline: `2px solid ${vars.colors.$input_container_hover_outline_color}`,
});

export const focusEffect = style({
  outline: `3px solid ${vars.colors.$input_container_focused_outline_color}`,
});
