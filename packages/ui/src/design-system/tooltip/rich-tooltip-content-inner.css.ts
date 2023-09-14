import { sx } from '../../design-tokens';

export const title = sx({
  color: '$tooltip_title_color',
});

export const description = sx({
  color: '$tooltip_label_color',
});

export const dot = sx({
  height: '$8',
  width: '$8',
  backgroundColor: '$tooltip_title_dot_bgColor',
  borderRadius: '$circle',
});
