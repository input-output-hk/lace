import { sx, style, vars } from '../../design-tokens';

export const root = sx({
  w: '$fill',
});

export const header = style([
  sx({
    height: '$fill',
    width: '$fill',
    py: '$24',
  }),
  {
    border: `${vars.spacing.$1} solid ${vars.colors.$summary_expander_container_borderColor}`,
    borderLeft: 'none',
    borderRight: 'none',
  },
]);

export const expanded = style({
  borderBottom: 'none',
});

export const title = sx({
  color: '$summary_expander_label_color',
});
