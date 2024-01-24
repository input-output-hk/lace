import { style, vars } from '../../design-tokens';

import { focusBoxShadow } from './select.css';

export const focus = style({
  boxShadow: focusBoxShadow,
});

export const testClassName = style({
  width: '200px',
});

export const hoverEffect = style({
  backgroundColor: vars.colors.$select_hover_background_color,
});
