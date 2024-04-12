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

  $toggle_button_group_bgColor: lightColorScheme.$primary_light_grey,
  $toggle_button_group_item_bgColor_hover: lightColorScheme.$primary_light_grey,
  $toggle_button_group_item_outline_focused:
    lightColorScheme.$primary_accent_purple_0_3,
  $toggle_button_group_item_label_color: lightColorScheme.$primary_dark_grey,
  $toggle_button_group_item_label_color_hover: lightColorScheme.$primary_black,
  $toggle_button_group_item_label_color_active: lightColorScheme.$primary_black,
  $toggle_button_group_item_label_color_disabled:
    lightColorScheme.$primary_dark_grey,
  $toggle_button_group_item_bgColor: lightColorScheme.$primary_light_grey,
  $toggle_button_group_item_bgColor_active: lightColorScheme.$primary_white,

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
  $control_buttons_label_color_extra_small: lightColorScheme.$primary_white,
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

  $control_buttons_container_bgColor_extra_small:
    lightColorScheme.$primary_accent_purple,
  $control_buttons_container_bgColor_extra_small_active:
    lightColorScheme.$primary_accent_purple,

  $variants_table_bgColor: lightColorScheme.$primary_light_grey_0_56,
  $variants_table_borderColor: lightColorScheme.$primary_light_grey_plus,

  $divider_bgColor: lightColorScheme.$primary_light_grey_plus,

  $bundle_input_container_bgColor: lightColorScheme.$primary_light_grey,
  $bundle_input_secondary_label_color: lightColorScheme.$primary_dark_grey,

  $bundle_input_max_button_container_bgColor:
    lightColorScheme.$primary_light_grey_plus,
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

  $dialog_container_bgColor: lightColorScheme.$primary_white,
  $dialog_description_color: lightColorScheme.$primary_black,

  $side_drawer_container_bgColor: lightColorScheme.$primary_white,
  $side_drawer_separator_bgColor: lightColorScheme.$primary_light_grey_plus,
  $side_drawer_content_title_color: lightColorScheme.$primary_black,

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

  $flow_card_container_bgColor: lightColorScheme.$primary_light_grey,

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

  $transaction_summary_amount_color: lightColorScheme.$primary_black,
  $transaction_summary_highlighted_amount_color:
    lightColorScheme.$secondary_data_green,
  $transaction_summary_secondary_label_color:
    lightColorScheme.$primary_dark_grey,
  $dapp_transaction_summary_positive_balance_label_color:
    lightColorScheme.$secondary_data_green,

  $dapp_transaction_summary_type_label_color:
    lightColorScheme.$primary_accent_purple,
  $dapp_transaction_summary_label: lightColorScheme.$primary_dark_grey,

  $toast_bar_container_bgColor: lightColorScheme.$primary_white,
  $toast_bar_icon_container_bgColor: lightColorScheme.$primary_light_grey,
  $toast_bar_icon_label_color: lightColorScheme.$primary_dark_grey,

  $tooltip_container_bgColor: lightColorScheme.$primary_white,
  $tooltip_title_dot_bgColor: lightColorScheme.$primary_accent_purple,

  $message_title_color: lightColorScheme.$primary_black,
  $message_description_color: lightColorScheme.$primary_dark_grey,

  $input_container_bgColor: lightColorScheme.$primary_light_grey,
  $input_container_hover_outline_color:
    lightColorScheme.$primary_light_grey_plus,
  $input_container_focused_outline_color:
    lightColorScheme.$secondary_hover_purple,
  $input_value_color: lightColorScheme.$primary_black,
  $input_button_bgColor: lightColorScheme.$primary_white,
  $input_button_icon_color: lightColorScheme.$primary_dark_grey,
  $input_label_color: lightColorScheme.$primary_dark_grey,

  $text_primary: lightColorScheme.$primary_black,
  $text_secondary: lightColorScheme.$primary_dark_grey,
  $text_on_gradient: lightColorScheme.$primary_white,

  $metadata_secondary_label_color: lightColorScheme.$primary_dark_grey,

  $text_link_label_color_visited: lightColorScheme.$primary_hover_purple,
  $text_link_label_color_disabled: lightColorScheme.$primary_grey,

  $profile_dropdown_trigger_label_color: lightColorScheme.$primary_dark_grey,
  $profile_dropdown_trigger_label_color_pressed:
    lightColorScheme.$primary_dark_grey,
  $profile_dropdown_trigger_container_borderColor:
    lightColorScheme.$primary_light_grey_plus,
  $profile_dropdown_trigger_container_bgColor: lightColorScheme.$primary_white,
  $profile_dropdown_trigger_container_bgColor_hover:
    lightColorScheme.$primary_light_grey,
  $profile_dropdown_trigger_container_bgColor_pressed:
    lightColorScheme.$primary_light_grey_0_56,
  $profile_dropdown_trigger_container_outlineColor:
    lightColorScheme.$primary_accent_purple_0_3,

  $profile_dropdown_wallet_option_container_bgColor_hover:
    lightColorScheme.$primary_light_grey,
  $profile_dropdown_wallet_option_container_bgColor_pressed:
    lightColorScheme.$primary_light_grey_plus_0_56,
  $profile_dropdown_wallet_option_container_outlineColor:
    lightColorScheme.$primary_accent_purple_0_3,
  $profile_dropdown_wallet_option_label_color: lightColorScheme.$primary_black,

  $profile_dropdown_wallet_status_container_borderColor:
    lightColorScheme.$primary_light_grey,

  $profile_dropdown_account_item_container_bgColor_hover:
    lightColorScheme.$primary_light_grey,
  $profile_dropdown_account_item_container_bgColor_pressed:
    lightColorScheme.$primary_light_grey_plus_0_56,
  $profile_dropdown_account_item_container_focus_outlineColor:
    lightColorScheme.$primary_accent_purple_0_3,
  $profile_dropdown_account_item_edit_icon_color:
    lightColorScheme.$primary_accent_purple,
  $profile_dropdown_account_item_delete_icon_color:
    lightColorScheme.$secondary_data_pink,

  $data_blue: lightColorScheme.$secondary_data_blue,
  $data_green: lightColorScheme.$secondary_data_green,
  $data_pink: lightColorScheme.$secondary_data_pink,
  $data_yellow: lightColorScheme.$secondary_lace_yellow,
  $data_orange: lightColorScheme.$secondary_data_orange,

  $educational_card_root_container_bgColor: lightColorScheme.$primary_white,
  $educational_card_root_container_borderColor:
    lightColorScheme.$primary_light_grey,

  $educational_card_item_container_bgColor: colorTransparent,
  $educational_card_item_container_bgColor_hover:
    lightColorScheme.$primary_light_grey,
  $educational_card_item_container_bgColor_pressed:
    lightColorScheme.$primary_light_grey_plus_0_56,
  $educational_card_item_container_outlineColor:
    lightColorScheme.$primary_accent_purple_0_3,
  $educational_card_item_icon_container_bgColor:
    lightColorScheme.$primary_white,
  $educational_card_item_icon_container_borderColor:
    lightColorScheme.$primary_light_grey_plus,

  $file_upload_container_bgColor: lightColorScheme.$primary_white,
  $file_upload_container_bgColor_hover: lightColorScheme.$primary_light_grey,
  $file_upload_container_bgColor_pressed:
    lightColorScheme.$primary_light_grey_0_56,
  $file_upload_container_bgColor_focused: lightColorScheme.$primary_white,
  $file_upload_container_outlineColor:
    lightColorScheme.$primary_accent_purple_0_3,
  $file_upload_container_borderColor: lightColorScheme.$primary_light_grey_plus,

  $file_upload_icon_container_bgColor: lightColorScheme.$primary_white,
  $file_upload_icon_container_borderColor: lightColorScheme.$primary_light_grey,

  $checkbox_check_color: lightColorScheme.$primary_white,
  $checkbox_checked_backgroundColor: lightColorScheme.$primary_accent_purple,
  $checkbox_unchecked_backgroundColor: colorTransparent,
  $checkbox_unchecked_borderColor: lightColorScheme.$primary_grey,
  $checkbox_focus_color: lightColorScheme.$primary_accent_purple_0_3,
  $checkbox_hover_unchecked_borderColor: lightColorScheme.$primary_dark_grey,
  $checkbox_hover_unchecked_backgroundColor: colorTransparent,
  $checkbox_hover_checked_backgroundColor:
    lightColorScheme.$primary_hover_purple,

  $radiobutton_focus_color: lightColorScheme.$primary_accent_purple_0_3,
  $radiobutton_hover_color: lightColorScheme.$primary_dark_grey_plus,
  $radiobutton_indicator_backgroundColor:
    lightColorScheme.$primary_accent_purple,
  $radiobutton_indicator_check_color: lightColorScheme.$primary_white,
  $radiobutton_unchecked_borderColor: lightColorScheme.$primary_grey,
  $radiobutton_unchecked_bgColor: 'transparent',
  $radiobutton_checked_bgColor: 'transparent',
  $radiobutton_icon_active: lightColorScheme.$primary_light_grey_plus_0_56,
  $radiobutton_icon_active_border_color:
    lightColorScheme.$primary_light_grey_plus,
  $radiobutton_icon_color: lightColorScheme.$primary_white,
  $radiobutton_icon_text_color: lightColorScheme.$primary_black,
  $radiobutton_icon_disabled_border_color: lightColorScheme.$primary_grey,
  $radiobutton_icon_hover_color: lightColorScheme.$primary_light_grey,
  $radiobutton_icon_hover_border_color:
    lightColorScheme.$primary_light_grey_plus,

  $select_border: lightColorScheme.$primary_grey,
  $select_icon_color: lightColorScheme.$primary_black,
  $select_background_color: lightColorScheme.$primary_white,
  $select_hover_background_color: lightColorScheme.$primary_light_grey_plus,
  $select_input_value_color: lightColorScheme.$primary_black,
  $select_input_background_data_highlighted:
    lightColorScheme.$primary_light_grey_plus_0_56,
  $select_input_focus_color: lightColorScheme.$primary_accent_purple_0_3,
  $select_input_rest_border_color: lightColorScheme.$primary_light_grey_plus,
  $select_input_hover_border_color: lightColorScheme.$primary_light_grey,

  $action_card_container_bgColor: lightColorScheme.$primary_white,
  $action_card_container_bgColor_hover: lightColorScheme.$primary_light_grey,
  $action_card_container_bgColor_pressed:
    lightColorScheme.$primary_light_grey_0_56,
  $action_card_container_bgColor_focused: lightColorScheme.$primary_white,
  $action_card_container_outlineColor:
    lightColorScheme.$primary_accent_purple_0_3,
  $action_card_container_borderColor: lightColorScheme.$primary_light_grey_plus,

  $action_card_icon_container_bgColor: lightColorScheme.$primary_white,
  $action_card_icon_container_borderColor: lightColorScheme.$primary_light_grey,

  $auto_suggest_container_background_color:
    lightColorScheme.$primary_light_grey,
  $auto_suggest_border_color: lightColorScheme.$primary_light_grey_plus,
  $auto_suggest_loader_color: lightColorScheme.$primary_accent_purple,
  $auto_suggest_check_color: lightColorScheme.$secondary_data_green,
  $auto_suggest_address_color: lightColorScheme.$primary_dark_grey,
  $auto_suggest_initial_bgColor: lightColorScheme.$primary_accent_purple_0_3,
  $auto_suggest_initial_color: lightColorScheme.$primary_accent_purple,

  $stake_pool_item_bg_hover: lightColorScheme.$primary_light_grey,
  $stake_pool_header_text_color: lightColorScheme.$primary_dark_grey,
  $stake_pool_item_text_color: lightColorScheme.$primary_black,

  $info_bar_container_bgColor: lightColorScheme.$secondary_cream,
  $info_bar_icon_color: lightColorScheme.$secondary_data_pink,
  $info_bar_message_color: lightColorScheme.$primary_black,
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
