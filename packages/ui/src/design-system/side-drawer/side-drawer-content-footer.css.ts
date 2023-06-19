import { sx, style } from '../../design-tokens';

export const gridArea = style({
  gridArea: 'footer',
});

export const container = style([
  sx({
    gap: '$16',
    display: 'grid',
    px: '$40',
    py: '$24',
    backgroundColor: '$side_drawer_container_bgColor',
  }),
  {
    gridTemplateColumns: '1fr',
    gridArea: 'footer',
  },
]);
