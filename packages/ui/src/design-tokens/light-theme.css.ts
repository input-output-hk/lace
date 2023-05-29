import { createTheme } from '@vanilla-extract/css';

import { laceGradient, lightColorScheme } from './colors.data';
import { opacities } from './opacities.data';
import { radius } from './radius.data';
import { spacing } from './spacing.data';
import { vars } from './theme.css';
import {
  fontWeights,
  fontSizes,
  lineHeights,
  fontFamily,
} from './typography.data';

import type { Colors } from './colors.data';
import type { Elevation } from './elevation.data';

const colors: Colors = {
  $lace_gradient: laceGradient,
  $transparent: 'rgba(0,0,0,0)',

  $buttons_primary_label_color: lightColorScheme.$primary_black,
  $buttons_primary_container_bgColor: lightColorScheme.$primary_white,
  $buttons_primary_container_bgColor_pressed:
    lightColorScheme.$primary_light_grey,
  $buttons_primary_container_borderColor: laceGradient,
  $buttons_primary_container_outlineColor:
    lightColorScheme.$primary_accent_purple_0_3,
  $buttons_primary_container_bgColor_disabled:
    lightColorScheme.$primary_dark_grey,

  $buttons_cta_label_color: lightColorScheme.$primary_white,
  $buttons_cta_container_bgColor: lightColorScheme.$primary_accent_purple,
  $buttons_cta_container_outlineColor:
    lightColorScheme.$primary_accent_purple_0_3,
  $buttons_cta_container_bgColor_pressed:
    lightColorScheme.$primary_hover_purple,
  $buttons_cta_container_bgColor_disabled:
    lightColorScheme.$primary_accent_purple,

  $buttons_secondary_label_color: lightColorScheme.$primary_dark_grey,
  $buttons_secondary_label_color_pressed: lightColorScheme.$primary_black,
  $buttons_secondary_container_bgColor: lightColorScheme.$primary_light_grey,
  $buttons_secondary_container_bgColor_hover:
    lightColorScheme.$primary_light_grey,
  $buttons_secondary_container_bgColor_pressed:
    lightColorScheme.$primary_light_grey_0_56,
  $buttons_secondary_container_bgColor_disabled:
    lightColorScheme.$primary_light_grey,
  $buttons_secondary_container_outlineColor:
    lightColorScheme.$primary_accent_purple_0_3,

  $control_buttons_filled_label_color: lightColorScheme.$primary_dark_grey,
  $control_buttons_filled_label_color_hover: lightColorScheme.$primary_black,
  $control_buttons_filled_container_bgColor: lightColorScheme.$primary_white,
  $control_buttons_filled_container_bgColor_hover:
    lightColorScheme.$primary_white,
  $control_buttons_filled_container_bgColor_pressed:
    lightColorScheme.$primary_white,
  $control_buttons_filled_container_outlineColor:
    lightColorScheme.$primary_accent_purple_0_3,

  $variants_table_bgColor: lightColorScheme.$primary_light_grey_0_56,
  $variants_table_borderColor: lightColorScheme.$primary_light_grey_plus,

  $divider_bgColor: lightColorScheme.$primary_light_grey_plus,

  $bundle_input_container_bgColor: lightColorScheme.$primary_light_grey,
  $bundle_input_primary_label_color: lightColorScheme.$primary_black,
  $bundle_input_secondary_label_color: lightColorScheme.$primary_dark_grey,
  $bundle_input_error_label_color: lightColorScheme.$secondary_data_pink,

  $bundle_input_max_button_container_bgColor:
    lightColorScheme.$primary_light_grey_plus,
  $bundle_input_max_button_label_color: lightColorScheme.$primary_dark_grey,
  $bundle_input_max_button_label_color_hover: lightColorScheme.$primary_black,

  $bundle_input_remove_button_container_bgColor:
    lightColorScheme.$primary_white,
  $bundle_input_remove_button_container_bgColor_hover:
    lightColorScheme.$primary_light_grey_0_56,
  $bundle_input_remove_button_outlineColor:
    lightColorScheme.$primary_accent_purple_0_3,
  $bundle_input_remove_button_label_color: lightColorScheme.$primary_dark_grey,
  $bundle_input_remove_button_label_color_hover:
    lightColorScheme.$primary_black,
  $bundle_input_remove_button_label_color_focused:
    lightColorScheme.$primary_dark_grey,

  $sub_navigation_container_borderColor:
    lightColorScheme.$primary_light_grey_plus,
  $sub_navigation_container_outlineColor:
    lightColorScheme.$primary_accent_purple_0_3,

  $sub_navigation_item_label_color: lightColorScheme.$primary_dark_grey,
  $sub_navigation_item_label_color_hover: lightColorScheme.$primary_black,
  $sub_navigation_item_label_color_pressed: lightColorScheme.$primary_black,
  $sub_navigation_item_label_color_focused: lightColorScheme.$primary_dark_grey,

  $profile_picture_avatar_label_color: lightColorScheme.$primary_white,
  $profile_picture_initials_label_color:
    lightColorScheme.$secondary_lace_yellow,
  $profile_picture_initials_container_bgColor:
    lightColorScheme.$secondary_lace_yellow,

  $profile_picture_image_container_borderColor:
    lightColorScheme.$primary_light_grey,
  $profile_picture_image_container_borderColor_selected:
    lightColorScheme.$secondary_lace_yellow,
};

export const elevation: Elevation = {
  $tooltip: '0px 0px 16px rgba(167, 143, 160, 0.2)',
  $dialog: '0px 0px 20px rgba(167, 143, 160, 0.15)',
  $primaryButton: '0px 4px 10px rgba(167, 143, 160, 0.2)',
  $assets: '0px 0px 5px rgba(0, 0, 0, 0.05), 0px 0px 10px rgba(0, 0, 0, 0.05)',
} as const;

export const lightTheme = createTheme(vars, {
  spacing,
  fontWeights,
  fontSizes,
  lineHeights,
  fontFamily,
  colors,
  radius,
  elevation,
  opacities,
});
