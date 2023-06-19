import { sx, style } from '../../design-tokens';

export const container = style([
  sx({
    width: '$fill',
    height: '$fill',
  }),
]);

export const content = style([
  sx({
    boxShadow: '$dialog',
    borderRadius: '$extraLarge',
    backgroundColor: '$side_drawer_container_bgColor',
    width: '$fill',
    height: '$fill',
    display: 'grid',
  }),
  {
    gridTemplateAreas: `
    "header"
    "body"
    "footer"`,
    gridTemplateRows: 'auto 1fr auto',
    overflow: 'hidden',
  },
]);
