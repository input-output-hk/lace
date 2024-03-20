import { sx, style, vars } from '../../design-tokens';

export const root = style([
  sx({
    width: '$fill',
    borderRadius: '$medium',
    backgroundColor: '$file_upload_container_bgColor',
    display: 'flex',
    padding: '$16',
  }),
  {
    cursor: 'pointer',
    border: `1px solid ${vars.colors.$file_upload_container_borderColor}`,
    ':hover': {
      backgroundColor: vars.colors.$file_upload_container_bgColor_hover,
    },
    ':active': {
      backgroundColor: vars.colors.$file_upload_container_bgColor_pressed,
    },
    selectors: {
      '&:focus:not(:active)': {
        outlineColor: `${vars.colors.$file_upload_container_outlineColor}`,
        outlineWidth: vars.spacing.$4,
        outlineStyle: 'solid',
        backgroundColor: vars.colors.$file_upload_container_bgColor_focused,
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
    backgroundColor: '$educational_card_item_icon_container_bgColor',
  }),
  {
    border: `${vars.spacing.$2} solid ${vars.colors.$educational_card_item_icon_container_borderColor}`,
    flexShrink: 0,
  },
]);

export const checkIconBox = style([
  sx({
    w: '$24',
    h: '$24',
    fontSize: '$25',
    color: '$data_green',
  }),
]);

export const removeButtonBox = style({
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: 0,
});
