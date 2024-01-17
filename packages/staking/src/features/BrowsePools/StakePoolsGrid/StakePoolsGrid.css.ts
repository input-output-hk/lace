import { style, sx } from '@lace/ui';

// this is temporary, until @lace/ui Grid component will accept responsive properties per breakpoint
export const grid = style([
  sx({
    display: 'grid',
    gap: '$20',
  }),
  {
    '@media': {
      'screen and (min-width: 1024px)': {
        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
      },
      'screen and (min-width: 1660px)': {
        gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
      },
    },
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  },
]);

// TODO export common Separator component from the @lace/ui
export const separator = sx({
  background: '$side_drawer_separator_bgColor',
  height: '$1',
  marginBottom: '$32',
  marginTop: '$32',
  width: '$fill',
});
