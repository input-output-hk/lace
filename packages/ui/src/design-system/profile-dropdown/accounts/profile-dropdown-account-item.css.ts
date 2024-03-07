import { sx, style, vars } from '../../../design-tokens';

export const root = style([
  sx({
    borderRadius: '$small',
    p: '$8',
  }),
  {
    width: '100%',
    minWidth: '218px',
    border: 'none',
    outline: 'none',
    cursor: 'pointer',

    selectors: {
      '&:hover': {
        background:
          vars.colors.$profile_dropdown_account_item_container_bgColor_hover,
      },
      '&:active': {
        background:
          vars.colors.$profile_dropdown_account_item_container_bgColor_pressed,
      },
      '&:focus-visible:not(:active)': {
        outlineColor: `${vars.colors.$profile_dropdown_account_item_container_focus_outlineColor}`,
        outlineWidth: vars.spacing.$4,
        outlineStyle: 'solid',
      },
    },
  },
]);

export const accountLabel = style([
  sx({
    color: '$text_secondary',
  }),
  {
    width: '118px',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
  },
]);

export const derivationPath = style([
  {
    lineHeight: '1.3',
  },
  sx({
    color: '$text_primary',
  }),
]);

export const editIcon = sx({
  color: '$profile_dropdown_account_item_edit_icon_color',
});

export const deleteIcon = sx({
  color: '$profile_dropdown_account_item_delete_icon_color',
});

export const tooltipStyle = style({
  left: '70px !important',
});
