import { sx, style, vars, createVar, globalStyle } from '../../design-tokens';

export const button = style({});

export const borderGap = createVar();

export const container = style([
  sx({
    px: '$8',
  }),
  {
    border: 'none',
    outline: 'none',
    position: 'relative',
    zIndex: 1,
    cursor: 'pointer',
    display: 'inline-flex',

    vars: {
      [borderGap]: '2px',
    },

    selectors: {
      '&[aria-disabled="true"]': {
        opacity: vars.opacities.$0_24,
      },

      '&:focus:not(:active)': {
        outlineColor: `${vars.colors.$buttons_secondary_container_outlineColor}`,
        outlineWidth: vars.spacing.$4,
        outlineStyle: 'solid',
        borderRadius: vars.spacing.$4,
      },
    },
  },
]);

export const labelSelector = style({});

export const label = style([
  sx({ color: '$text_link_label_color' }),
  {
    selectors: {
      [`${button}:hover &`]: {
        textDecoration: 'underline',
      },
      [`${button}[aria-disabled="true"] &`]: {
        color: vars.colors.$text_link_label_color_disabled,
      },
    },
    wordBreak: 'break-all',
  },
]);

globalStyle(`a:visited ${labelSelector}`, {
  color: vars.colors.$text_link_label_color_visited,
});
