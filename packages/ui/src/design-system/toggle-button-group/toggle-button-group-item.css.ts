import { style, sx, vars } from '../../design-tokens';

import * as toggleButtonGroupRootCn from './toggle-button-group-root.css';

export const root = style([
  sx({
    padding: '$8',
    fontSize: '$16',
    color: '$toggle_button_group_item_label_color',
    backgroundColor: '$toggle_button_group_item_bgColor',
    borderRadius: '$small',
    gap: '$6',
  }),
  {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
    border: 0,
    selectors: {
      [`${toggleButtonGroupRootCn.rootCompact} > &`]: {
        flexGrow: 0,
      },
      '&:hover': {
        color: vars.colors.$toggle_button_group_item_label_color_hover,
        backgroundColor: vars.colors.$toggle_button_group_item_bgColor_hover,
        cursor: 'pointer',
      },
      "&[data-state='on']": {
        color: vars.colors.$toggle_button_group_item_label_color_active,
        backgroundColor: vars.colors.$toggle_button_group_item_bgColor_active,
      },
      '&:active': {
        color: vars.colors.$toggle_button_group_item_label_color_active,
        backgroundColor: vars.colors.$toggle_button_group_item_bgColor_active,
      },
      '&:disabled': {
        color: vars.colors.$toggle_button_group_item_label_color_disabled,
        pointerEvents: 'none',
        opacity: vars.opacities.$0_24,
      },
      '&:focus-visible': {
        outlineColor: vars.colors.$toggle_button_group_item_outline_focused,
        outlineWidth: vars.spacing.$4,
        outlineStyle: 'solid',
      },
    },
  },
]);

export const icon = sx({
  width: '$20',
  height: '$20',
});
