import { createTheme } from '@vanilla-extract/css';

import { darkColorScheme, laceGradient, lightColorScheme } from './colors.data';
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

  $buttons_primary_label_color: darkColorScheme.$primary_white,
  $buttons_primary_container_bgColor: darkColorScheme.$primary_mid_black,
  $buttons_primary_container_bgColor_pressed: darkColorScheme.$primary_bg_black,
  $buttons_primary_container_borderColor: laceGradient,
  $buttons_primary_container_outlineColor:
    darkColorScheme.$primary_accent_purple_0_3,
  $buttons_primary_container_bgColor_disabled:
    darkColorScheme.$primary_bg_black,

  $buttons_cta_label_color: darkColorScheme.$primary_white,
  $buttons_cta_container_bgColor: darkColorScheme.$primary_accent_purple,
  $buttons_cta_container_outlineColor: darkColorScheme.$primary_hover_purple,
  $buttons_cta_container_bgColor_pressed: darkColorScheme.$primary_hover_purple,
  $buttons_cta_container_bgColor_disabled:
    darkColorScheme.$primary_accent_purple,

  $buttons_secondary_label_color: darkColorScheme.$primary_light_grey,
  $buttons_secondary_label_color_pressed: darkColorScheme.$primary_white,
  $buttons_secondary_container_bgColor: darkColorScheme.$primary_grey,
  $buttons_secondary_container_bgColor_pressed:
    darkColorScheme.$primary_mid_grey,
  $buttons_secondary_container_bgColor_hover:
    darkColorScheme.$primary_dark_grey,
  $buttons_secondary_container_bgColor_disabled: darkColorScheme.$primary_grey,
  $buttons_secondary_container_outlineColor:
    darkColorScheme.$primary_accent_purple_0_3,

  $control_buttons_filled_label_color: darkColorScheme.$primary_light_grey,
  $control_buttons_filled_label_color_hover: darkColorScheme.$primary_white,
  $control_buttons_filled_container_bgColor: darkColorScheme.$primary_grey,
  $control_buttons_filled_container_bgColor_hover:
    darkColorScheme.$primary_mid_grey,
  $control_buttons_filled_container_bgColor_pressed:
    darkColorScheme.$primary_dark_grey,
  $control_buttons_filled_container_outlineColor:
    darkColorScheme.$primary_accent_purple_0_3,

  $variants_table_bgColor: '#1E1E1E',
  $variants_table_borderColor: 'rgba(255, 255, 255, 0.07)',

  $divider_bgColor: darkColorScheme.$primary_mid_grey,

  $bundle_input_container_bgColor: darkColorScheme.$primary_dark_grey,
  $bundle_input_primary_label_color: darkColorScheme.$primary_white,
  $bundle_input_secondary_label_color: darkColorScheme.$primary_light_grey,

  $bundle_input_max_button_container_bgColor: darkColorScheme.$primary_grey,
  $bundle_input_max_button_label_color: darkColorScheme.$primary_light_grey,
  $bundle_input_max_button_label_color_hover: darkColorScheme.$primary_white,

  $bundle_input_remove_button_container_bgColor:
    darkColorScheme.$primary_dark_grey,
  $bundle_input_remove_button_container_bgColor_hover:
    darkColorScheme.$primary_dark_grey,
  $bundle_input_remove_button_outlineColor:
    darkColorScheme.$primary_accent_purple_0_3,
  $bundle_input_remove_button_label_color: darkColorScheme.$primary_light_grey,
  $bundle_input_remove_button_label_color_hover: darkColorScheme.$primary_white,
  $bundle_input_remove_button_label_color_focused:
    darkColorScheme.$primary_light_grey,
  $bundle_input_error_label_color: darkColorScheme.$secondary_data_pink,

  $sub_navigation_container_borderColor:
    lightColorScheme.$primary_light_grey_plus,

  $sub_navigation_item_label_color: lightColorScheme.$primary_grey,
  $sub_navigation_container_outlineColor:
    darkColorScheme.$primary_accent_purple_0_3,
  $sub_navigation_item_label_color_hover: darkColorScheme.$primary_white,
  $sub_navigation_item_label_color_pressed: darkColorScheme.$primary_white,
  $sub_navigation_item_label_color_focused: darkColorScheme.$primary_grey,

  $profile_picture_avatar_label_color: darkColorScheme.$primary_mid_black,
  $profile_picture_initials_label_color: darkColorScheme.$secondary_lace_yellow,
  $profile_picture_initials_container_bgColor:
    darkColorScheme.$secondary_lace_yellow,

  $profile_picture_image_container_borderColor: 'transparent',
  $profile_picture_image_container_borderColor_selected: 'transparent',
};

const elevation: Elevation = {
  $tooltip: '0px 0px 16px rgba(167, 143, 160, 0.2)',
  $dialog: '0px 0px 20px rgba(167, 143, 160, 0.15)',
  $primaryButton: 'none',
  $assets: '0px 0px 5px rgba(0, 0, 0, 0.05), 0px 0px 10px rgba(0, 0, 0, 0.05)',
};

export const darkTheme = createTheme(vars, {
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
