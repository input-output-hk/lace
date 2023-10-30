import { style, sx } from '../../design-tokens';

export const label = sx({
  color: '$tooltip_label_color',
});

export const tooltipContent = style([
  sx({
    background: '$tooltip_container_bgColor',
    margin: '$10',
    borderRadius: '$small',
    boxShadow: '$tooltip',
    padding: '$16',
    maxWidth: '$214',
  }),
  {
    position: 'relative',
  },
]);
