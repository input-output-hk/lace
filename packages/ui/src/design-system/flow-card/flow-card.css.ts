import { sx, style } from '../../design-tokens';

export const container = style([
  sx({
    width: '$fill',
    borderRadius: '$medium',
    px: '$32',
    py: '$28',
    background: '$flow_card_container_bgColor',
  }),
  {
    display: 'grid',
    gridTemplateAreas: `"profile details"`,
    boxSizing: 'border-box',
  },
]);
