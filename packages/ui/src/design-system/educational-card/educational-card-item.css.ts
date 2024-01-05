import { sx, style, vars } from '../../design-tokens';

export const root = style([
  sx({
    width: '$fill',
    borderRadius: '$medium',
  }),
  {
    cursor: 'pointer',
    ':hover': {
      backgroundColor:
        vars.colors.$educational_card_item_container_bgColor_hover,
    },
    ':active': {
      backgroundColor:
        vars.colors.$educational_card_item_container_bgColor_pressed,
    },
    selectors: {
      '&:focus:not(:active)': {
        outlineColor: `${vars.colors.$educational_card_item_container_outlineColor}`,
        outlineWidth: vars.spacing.$4,
        outlineStyle: 'solid',
      },
    },
  },
]);

export const iconBox = style([
  sx({
    w: '$56',
    h: '$56',
    borderRadius: '$small',
    fontSize: '$25',
    backgroundColor: '$educational_card_item_icon_container_bgColor',
  }),
  {
    border: `${vars.spacing.$2} solid ${vars.colors.$educational_card_item_icon_container_borderColor}`,
  },
]);

export const label = sx({
  color: '$educational_card_item_label_color',
});

export const title = sx({
  color: '$educational_card_item_title_color',
});
