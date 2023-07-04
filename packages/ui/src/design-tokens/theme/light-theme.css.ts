import { createGlobalTheme } from '@vanilla-extract/css';
import { rgba } from 'polished';

import { borders } from '../borders.data';
import {
  colorTransparent,
  darkColorScheme,
  laceGradient,
  lightColorScheme,
} from '../colors.data';
import { opacities } from '../opacities.data';
import { radius } from '../radius.data';
import { spacing } from '../spacing.data';
import {
  fontWeights,
  fontSizes,
  lineHeights,
  fontFamily,
} from '../typography.data';

import { vars } from './theme-contract.css';

import type { Colors } from '../colors.data';
import type { Elevation } from '../elevation.data';

const colors: Colors = {
  $lace_typography_main_color: lightColorScheme.$primary_black,
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

  $card_elevated_backgroundColor: lightColorScheme.$primary_white,
  $card_greyed_backgroundColor: lightColorScheme.$primary_light_grey,
  $card_outlined_backgroundColor: lightColorScheme.$primary_white,
  $card_outlined_borderColor: lightColorScheme.$primary_light_grey_plus,

  $control_buttons_label_color: lightColorScheme.$primary_black,
  $control_buttons_label_color_hover: lightColorScheme.$primary_black,
  $control_buttons_label_color_filled: lightColorScheme.$primary_dark_grey,
  $control_buttons_label_color_filled_hover: lightColorScheme.$primary_black,
  $control_buttons_label_color_danger: lightColorScheme.$primary_white,
  $control_buttons_label_color_danger_pressed: rgba(
    lightColorScheme.$primary_white,
    0.8,
  ),
  $control_buttons_container_bgColor: lightColorScheme.$primary_white,
  $control_buttons_container_bgColor_hover:
    lightColorScheme.$primary_light_grey,
  $control_buttons_container_bgColor_filled: lightColorScheme.$primary_white,
  $control_buttons_container_bgColor_filled_hover:
    lightColorScheme.$primary_white,
  $control_buttons_container_bgColor_pressed: rgba(
    lightColorScheme.$primary_light_grey,
    0.56,
  ),
  $control_buttons_container_bgColor_danger:
    lightColorScheme.$secondary_data_pink,
  $control_buttons_container_bgColor_danger_hover:
    lightColorScheme.$secondary_hover_data_pink,
  $control_buttons_container_outlineColor:
    lightColorScheme.$primary_accent_purple_0_3,
  $control_buttons_borderColor: lightColorScheme.$primary_light_grey_plus,
  $control_buttons_borderColor_danger:
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

  $navigation_button_label_color: lightColorScheme.$primary_dark_grey,
  $navigation_button_label_color_pressed: lightColorScheme.$primary_black,
  $navigation_button_container_bgColor: lightColorScheme.$primary_light_grey,
  $navigation_button_container_bgColor_hover:
    lightColorScheme.$primary_light_grey,
  $navigation_button_container_bgColor_pressed:
    lightColorScheme.$primary_light_grey_0_56,
  $navigation_button_container_outlineColor:
    lightColorScheme.$primary_accent_purple_0_3,

  $profile_picture_avatar_label_color: lightColorScheme.$primary_white,
  $profile_picture_initials_label_color:
    lightColorScheme.$secondary_lace_yellow,
  $profile_picture_initials_container_bgColor:
    lightColorScheme.$secondary_lace_yellow,
  $profile_picture_image_container_borderColor:
    lightColorScheme.$primary_light_grey,
  $profile_picture_image_container_borderColor_selected:
    lightColorScheme.$secondary_lace_yellow,

  $scrollbar_thumb_container_bgColor: lightColorScheme.$primary_light_grey_plus,
  $scrollbar_thumb_container_bgColor_hover: lightColorScheme.$primary_grey,

  $toggle_switch_label_color: lightColorScheme.$primary_dark_grey,
  $toggle_switch_container_bgColor_on: laceGradient,
  $toggle_switch_container_bgColor_off: lightColorScheme.$primary_grey,
  $toggle_switch_container_bgColor_disabled:
    darkColorScheme.$primary_light_grey,
  $toggle_switch_container_outline: lightColorScheme.$primary_accent_purple_0_3,
  $toggle_switch_thumb_bgColor: lightColorScheme.$primary_grey,

  $assets_table_container_bgColor_hover: lightColorScheme.$primary_light_grey,
  $assets_table_label_primary_color: lightColorScheme.$primary_black,
  $assets_table_label_secondary_color: lightColorScheme.$primary_dark_grey,
  $assets_table_market_price_trend_up_label_color:
    lightColorScheme.$secondary_data_green,
  $assets_table_market_price_trend_down_label_color:
    lightColorScheme.$secondary_data_pink,

  $side_drawer_container_bgColor: lightColorScheme.$primary_white,
  $side_drawer_separator_bgColor: lightColorScheme.$primary_light_grey_plus,
  $side_drawer_head_title_color: lightColorScheme.$primary_black,
  $side_drawer_content_title_color: lightColorScheme.$primary_black,
  $side_drawer_content_description_color: lightColorScheme.$primary_dark_grey,

  $search_box_container_bgColor: lightColorScheme.$primary_light_grey,
  $search_box_container_bgColor_pressed:
    lightColorScheme.$primary_light_grey_plus_0_56,
  $search_box_container_borderColor_hover:
    lightColorScheme.$primary_light_grey_plus_0_56,
  $search_box_container_outlineColor:
    lightColorScheme.$primary_accent_purple_0_3,
  $search_box_label_color: lightColorScheme.$primary_dark_grey,
  $search_box_label_color_pressed: lightColorScheme.$primary_black,
  $search_box_clear_button_container_bgColor:
    lightColorScheme.$primary_light_grey_0_56,
  $search_box_clear_button_container_bgColor_hover:
    lightColorScheme.$primary_light_grey,
  $search_box_clear_button_container_bgColor_pressed:
    lightColorScheme.$primary_white,
  $search_box_clear_button_container_outlineColor:
    lightColorScheme.$primary_accent_purple_0_3,
  $search_box_clear_button_label_color: lightColorScheme.$primary_dark_grey,
  $search_box_clear_button_label_color_hover:
    lightColorScheme.$primary_dark_grey,
  $search_box_clear_button_label_color_pressed:
    lightColorScheme.$primary_dark_grey,

  $icon_button_label_color: lightColorScheme.$primary_dark_grey,
  $icon_button_label_color_pressed: lightColorScheme.$primary_black,
  $icon_button_container_bgColor: colorTransparent,
  $icon_button_container_bgColor_hover: lightColorScheme.$primary_light_grey,
  $icon_button_container_bgColor_pressed:
    lightColorScheme.$primary_light_grey_0_56,
  $icon_button_container_outlineColor:
    lightColorScheme.$primary_accent_purple_0_3,

  $summary_expander_container_borderColor:
    lightColorScheme.$primary_light_grey_plus,
  $summary_expander_label_color: lightColorScheme.$primary_black,
  $summary_expander_trigger_label_color: lightColorScheme.$primary_black,
  $summary_expander_trigger_label_color_pressed:
    lightColorScheme.$primary_black,
  $summary_expander_trigger_container_bgColor: lightColorScheme.$primary_white,
  $summary_expander_trigger_container_bgColor_hover:
    lightColorScheme.$primary_light_grey,
  $summary_expander_trigger_container_bgColor_pressed:
    lightColorScheme.$primary_light_grey_plus,
  $summary_expander_trigger_container_bgColor_focused:
    lightColorScheme.$primary_white,
  $summary_expander_trigger_container_outlineColor:
    lightColorScheme.$primary_accent_purple_0_3,
  $summary_expander_trigger_container_borderColor:
    lightColorScheme.$primary_light_grey_plus,

  $transaction_summary_label_color: lightColorScheme.$primary_black,
  $transaction_summary_secondary_label_color:
    lightColorScheme.$primary_dark_grey,
};

export const elevation: Elevation = {
  $tooltip: '0px 0px 16px rgba(167, 143, 160, 0.2)',
  $dialog: '0px 0px 20px rgba(167, 143, 160, 0.15)',
  $primaryButton: '0px 4px 10px rgba(167, 143, 160, 0.2)',
  $assets: '0px 0px 5px rgba(0, 0, 0, 0.05), 0px 0px 10px rgba(0, 0, 0, 0.05)',
  $card: '0px 0px 20px rgba(167, 143, 160, 0.15)',
} as const;

export const theme = {
  borders,
  spacing,
  fontWeights,
  fontSizes,
  lineHeights,
  fontFamily,
  colors,
  radius,
  elevation,
  opacities,
};

createGlobalTheme('[data-theme="light"]:root', vars, theme);
