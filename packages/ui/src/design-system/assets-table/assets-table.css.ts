import { sx, style, vars } from '../../design-tokens';

export const container = style([
  sx({
    width: '$fill',
    height: '$80',
    borderRadius: '$medium',
    p: '$16',
  }),
  {
    display: 'grid',
    gridTemplateAreas: `"tokenProfile marketPrice tokenAmount"`,
    boxSizing: 'border-box',
    maxWidth: '700px',

    ':hover': {
      backgroundColor: vars.colors.$assets_table_container_bgColor_hover,
    },

    ':focus-visible': {
      backgroundColor: vars.colors.$assets_table_container_bgColor_hover,
    },
  },
]);
