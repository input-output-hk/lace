import { sx, style, vars } from '../../design-tokens';

export const container = style([
  sx({
    width: '$fill',
    height: '$64',
    borderRadius: '$medium',
    paddingLeft: '$16',
    py: '$6',
    paddingRight: '$6',
    background: '$search_box_container_bgColor',
    alignItems: 'center',
    gap: '$16',
  }),
  {
    display: 'grid',
    gridTemplateAreas: `"searchIcon inputField clearButton"`,
    gridTemplateColumns: 'auto minmax(0, 1fr)',
    gridTemplateRows: '100% auto 100%',
    boxSizing: 'border-box',
    border: `${vars.spacing.$1} solid transparent`,

    ':hover': {
      borderColor: vars.colors.$search_box_container_borderColor_hover,
    },

    ':focus-visible': {
      backgroundColor: vars.colors.$search_box_container_bgColor_pressed,
    },
  },
]);

export const active = sx({
  background: '$search_box_container_bgColor_pressed',
});

export const disabled = sx({
  opacity: '$0_24',
});
