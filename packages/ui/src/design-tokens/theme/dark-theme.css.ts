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
  $lace_typography_main_color: darkColorScheme.$primary_white,
  $lace_gradient: laceGradient,
  $transparent: colorTransparent,

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

  $card_elevated_backgroundColor: darkColorScheme.$primary_mid_black,
  $card_greyed_backgroundColor: darkColorScheme.$primary_dark_grey_plus,
  $card_outlined_backgroundColor: darkColorScheme.$primary_mid_black,
  $card_outlined_borderColor: colorTransparent,

  $control_buttons_label_color: darkColorScheme.$primary_white,
  $control_buttons_label_color_hover: darkColorScheme.$primary_light_grey,
  $control_buttons_label_color_filled: darkColorScheme.$primary_light_grey,
  $control_buttons_label_color_filled_hover: darkColorScheme.$primary_white,
  $control_buttons_label_color_danger: darkColorScheme.$primary_white,
  $control_buttons_label_color_danger_pressed: rgba(
    darkColorScheme.$primary_white,
    0.8,
  ),
  $control_buttons_container_bgColor_filled: darkColorScheme.$primary_grey,
  $control_buttons_container_bgColor_filled_hover:
    darkColorScheme.$primary_mid_grey,
  $control_buttons_container_bgColor: darkColorScheme.$primary_bg_black,
  $control_buttons_container_bgColor_hover: darkColorScheme.$primary_mid_grey,
  $control_buttons_container_bgColor_pressed:
    darkColorScheme.$primary_dark_grey,
  $control_buttons_container_bgColor_danger:
    darkColorScheme.$secondary_data_pink,
  $control_buttons_container_bgColor_danger_hover:
    darkColorScheme.$secondary_hover_data_pink,
  $control_buttons_container_outlineColor:
    darkColorScheme.$primary_accent_purple_0_3,
  $control_buttons_borderColor: darkColorScheme.$primary_dark_grey_plus,
  $control_buttons_borderColor_danger:
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

  $navigation_button_container_bgColor: darkColorScheme.$primary_grey,
  $navigation_button_container_bgColor_hover:
    darkColorScheme.$primary_dark_grey,
  $navigation_button_container_bgColor_pressed:
    darkColorScheme.$primary_mid_grey,
  $navigation_button_container_outlineColor:
    darkColorScheme.$primary_accent_purple_0_3,
  $navigation_button_label_color: darkColorScheme.$primary_light_grey,
  $navigation_button_label_color_pressed: darkColorScheme.$primary_white,

  $profile_picture_avatar_label_color: darkColorScheme.$primary_mid_black,
  $profile_picture_initials_label_color: darkColorScheme.$secondary_lace_yellow,
  $profile_picture_initials_container_bgColor:
    darkColorScheme.$secondary_lace_yellow,
  $profile_picture_image_container_borderColor: 'transparent',
  $profile_picture_image_container_borderColor_selected: 'transparent',

  $scrollbar_thumb_container_bgColor: darkColorScheme.$primary_mid_grey,
  $scrollbar_thumb_container_bgColor_hover: darkColorScheme.$primary_grey,

  $toggle_switch_label_color: darkColorScheme.$primary_light_grey,
  $toggle_switch_container_bgColor_on: darkColorScheme.$primary_mid_grey,
  $toggle_switch_container_bgColor_off: darkColorScheme.$primary_accent_purple,
  $toggle_switch_container_bgColor_disabled:
    darkColorScheme.$primary_light_grey,
  $toggle_switch_container_outline: lightColorScheme.$primary_accent_purple_0_3,
  $toggle_switch_thumb_bgColor: darkColorScheme.$primary_white,

  $assets_table_container_bgColor_hover: darkColorScheme.$primary_mid_grey,
  $assets_table_label_primary_color: darkColorScheme.$primary_white,
  $assets_table_label_secondary_color: darkColorScheme.$primary_light_grey,
  $assets_table_market_price_trend_up_label_color:
    lightColorScheme.$secondary_data_green,
  $assets_table_market_price_trend_down_label_color:
    lightColorScheme.$secondary_data_pink,

  $side_drawer_container_bgColor: darkColorScheme.$primary_light_black,
  $side_drawer_separator_bgColor: darkColorScheme.$primary_mid_grey,
  $side_drawer_head_title_color: darkColorScheme.$primary_white,
  $side_drawer_content_title_color: darkColorScheme.$primary_white,
  $side_drawer_content_description_color: darkColorScheme.$primary_light_grey,

  $search_box_container_bgColor: darkColorScheme.$primary_dark_grey,
  $search_box_container_bgColor_pressed: darkColorScheme.$primary_mid_grey,
  $search_box_container_borderColor_hover: darkColorScheme.$primary_grey,
  $search_box_container_outlineColor:
    darkColorScheme.$primary_accent_purple_0_3,
  $search_box_label_color: darkColorScheme.$primary_light_grey,
  $search_box_label_color_pressed: darkColorScheme.$primary_white,
  $search_box_clear_button_container_bgColor:
    darkColorScheme.$primary_dark_grey,
  $search_box_clear_button_container_bgColor_hover:
    darkColorScheme.$primary_dark_grey,
  $search_box_clear_button_container_bgColor_pressed:
    darkColorScheme.$primary_dark_grey,
  $search_box_clear_button_container_outlineColor:
    darkColorScheme.$primary_accent_purple_0_3,
  $search_box_clear_button_label_color: darkColorScheme.$primary_light_grey,
  $search_box_clear_button_label_color_hover: darkColorScheme.$primary_white,
  $search_box_clear_button_label_color_pressed:
    darkColorScheme.$primary_light_grey,

  $flow_card_container_bgColor: darkColorScheme.$primary_dark_grey,
  $flow_card_label_primary_color: darkColorScheme.$primary_white,
  $flow_card_label_secondary_color: darkColorScheme.$primary_light_grey,

  $icon_button_label_color: darkColorScheme.$primary_light_grey,
  $icon_button_label_color_pressed: darkColorScheme.$primary_white,
  $icon_button_container_bgColor: colorTransparent,
  $icon_button_container_bgColor_hover: darkColorScheme.$primary_mid_grey,
  $icon_button_container_bgColor_pressed: darkColorScheme.$primary_dark_grey,
  $icon_button_container_outlineColor:
    darkColorScheme.$primary_accent_purple_0_3,

  $summary_expander_container_borderColor: darkColorScheme.$primary_mid_grey,
  $summary_expander_label_color: darkColorScheme.$primary_white,
  $summary_expander_trigger_label_color: darkColorScheme.$primary_white,
  $summary_expander_trigger_label_color_pressed: darkColorScheme.$primary_white,
  $summary_expander_trigger_container_bgColor: colorTransparent,
  $summary_expander_trigger_container_bgColor_hover:
    darkColorScheme.$primary_light_black,
  $summary_expander_trigger_container_bgColor_pressed:
    darkColorScheme.$primary_light_black,
  $summary_expander_trigger_container_bgColor_focused: colorTransparent,
  $summary_expander_trigger_container_outlineColor:
    darkColorScheme.$primary_accent_purple_0_3,
  $summary_expander_trigger_container_borderColor:
    darkColorScheme.$primary_mid_grey,

  $transaction_summary_label_color: darkColorScheme.$primary_white,
  $transaction_summary_secondary_label_color:
    darkColorScheme.$primary_light_grey,
};

const elevation: Elevation = {
  $tooltip: '0px 0px 16px rgba(167, 143, 160, 0.2)',
  $dialog: 'none',
  $primaryButton: 'none',
  $assets: '0px 0px 5px rgba(0, 0, 0, 0.05), 0px 0px 10px rgba(0, 0, 0, 0.05)',
  $card: 'none',
};

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

createGlobalTheme('[data-theme="dark"]:root', vars, theme);
