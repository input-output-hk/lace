import { sx, style, vars } from '../../design-tokens';

export const root = style({});

const active = '[data-state="active"]';

export const container = style([
  sx({
    width: '$auto',
    display: 'inline-block',
  }),
  {
    cursor: 'pointer',
    outline: 'none',
  },
]);

export const trigger = style({
  background: 'none',
  border: 'none',
  padding: 0,
});

export const disabled = style([
  sx({
    opacity: '$0_24',
  }),
]);

const labelContainerFocused = {
  borderRadius: vars.radius.$tiny,
  boxShadow: `0 0 0 3px ${vars.colors.$sub_navigation_container_outlineColor}`,
};

export const labelContainer = style([
  sx({
    px: '$10',
    mb: '$8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '$24',
    boxSizing: 'border-box',
  }),
  {
    selectors: {
      [`${root}:focus-visible:not(${active}) &`]: labelContainerFocused,
      [`${root}:focus-visible:not(:active) &`]: labelContainerFocused,
    },
  },
]);

export const label = style([
  {
    color: vars.colors.$sub_navigation_item_label_color,
    selectors: {
      [`${root}:hover &`]: {
        color: vars.colors.$sub_navigation_item_label_color_hover,
      },
      [`${root}:focus-visible:not(${active}) &`]: {
        color: vars.colors.$sub_navigation_item_label_color_focused,
      },
      [`${root}:focus-visible:is(${active}) &`]: {
        color: vars.colors.$sub_navigation_item_label_color_pressed,
      },
      [`${active} &`]: {
        color: vars.colors.$sub_navigation_item_label_color_pressed,
      },
    },
  },
]);

export const highlight = style([
  sx({
    background: '$lace_gradient',
    borderRadius: '$full',
  }),
  {
    height: '3px',
    visibility: 'hidden',
  },
  {
    selectors: {
      [`${root}:active &`]: {
        visibility: 'visible',
      },
      [`${active} &`]: {
        visibility: 'visible',
      },
    },
  },
]);

export const halfHighlight = sx({
  width: '$56',
  margin: '$auto',
});
