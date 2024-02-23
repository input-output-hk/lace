import { sx, style, vars } from '../../design-tokens';

export const root = style([
  sx({
    width: '$fill',
    borderRadius: '$medium',
    backgroundColor: '$action_card_container_bgColor',
    display: 'flex',
    padding: '$16',
  }),
  {
    cursor: 'pointer',
    border: `1px solid ${vars.colors.$action_card_container_borderColor}`,
    ':hover': {
      backgroundColor: vars.colors.$action_card_container_bgColor_hover,
    },
    ':active': {
      backgroundColor: vars.colors.$action_card_container_bgColor_pressed,
    },
    selectors: {
      '&:focus:not(:active)': {
        outlineColor: `${vars.colors.$action_card_container_outlineColor}`,
        outlineWidth: vars.spacing.$4,
        outlineStyle: 'solid',
        backgroundColor: vars.colors.$action_card_container_bgColor_focused,
      },
    },
  },
]);

export const iconBox = style([
  sx({
    w: '$56',
    h: '$56',
    borderRadius: '$circle',
    fontSize: '$25',
    backgroundColor: '$action_card_icon_container_bgColor',
  }),
  {
    border: `${vars.spacing.$2} solid ${vars.colors.$educational_card_item_icon_container_borderColor}`,
    flexShrink: 0,
  },
]);
