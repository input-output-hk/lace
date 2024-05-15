import { sx, vars, style, createVar } from '../../design-tokens';

const boxShadow = createVar();

export const disabled = sx({
  opacity: '$0_24',
});

export const root = style({});

export const toogleSwitch = style([
  sx({
    width: '$44',
    height: '$24',
    background: '$toggle_switch_container_bgColor_off',
    borderRadius: '$small',
  }),
  {
    padding: '0',
    border: 'none',
    position: 'relative',
    WebkitTapHighlightColor: 'rgba(0, 0, 0, 0)',

    ':disabled': {
      background: vars.colors.$toggle_switch_container_bgColor_disabled,
    },

    selectors: {
      '&[data-state="checked"]:not(:disabled)': {
        background: vars.colors.$toggle_switch_container_bgColor_on,
      },
      '&:active': {
        outline: 'none',
      },
      '&:focus:not(:active)': {
        outlineColor: `${vars.colors.$buttons_cta_container_outlineColor}`,
        outlineWidth: vars.spacing.$4,
        outlineStyle: 'solid',
      },
    },
  },
]);

export const thumb = style([
  sx({
    width: '$20',
    height: '$20',
    borderRadius: '$circle',
  }),
  {
    display: 'block',
    backgroundColor: 'white',
    boxShadow: boxShadow,
    transition: 'transform 100ms',
    transform: 'translateX(2px)',
    willChange: 'transform',

    vars: {
      [boxShadow]:
        '0px 1px 3px rgba(0, 0, 0, 0.1), 0px 1px 2px rgba(0, 0, 0, 0.06)',
    },

    selectors: {
      '&[data-state="checked"]': {
        transform: 'translateX(22px)',
      },
    },
  },
]);

export const label = sx({
  mr: '$8',
});

export const iconContainer = style([
  sx({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    mr: '$8',
    width: '$24',
    height: '$24',
    color: '$text_secondary',
    fontSize: '$25',
  }),
  {
    overflow: 'hidden',
  },
]);
