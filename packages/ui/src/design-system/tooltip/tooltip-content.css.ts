import { style, sx } from '../../design-tokens';

export const tooltipContent = style([
  sx({
    background: '$tooltip_container_bgColor',
    borderRadius: '$small',
    boxShadow: '$tooltip',
    maxWidth: '$214',
    padding: '$8',
    paddingLeft: '$16',
    paddingRight: '$16',
  }),
  {
    position: 'relative',
    wordBreak: 'break-word',
  },
]);
