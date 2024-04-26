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
  $focused_outline: darkColorScheme.$primary_accent_purple_0_3,

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

  $toggle_button_group_bgColor: darkColorScheme.$primary_mid_black,
  $toggle_button_group_item_bgColor_hover: darkColorScheme.$primary_mid_grey,
  $toggle_button_group_item_outline_focused:
    darkColorScheme.$primary_accent_purple_0_3,
  $toggle_button_group_item_label_color: darkColorScheme.$primary_light_grey,
  $toggle_button_group_item_label_color_hover:
    darkColorScheme.$primary_light_grey,
  $toggle_button_group_item_label_color_active: darkColorScheme.$primary_white,
  $toggle_button_group_item_label_color_disabled:
    darkColorScheme.$primary_light_grey,
  $toggle_button_group_item_bgColor: darkColorScheme.$primary_mid_black,
  $toggle_button_group_item_bgColor_active: darkColorScheme.$primary_grey,

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
  $control_buttons_label_color_extra_small: darkColorScheme.$primary_white,
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
  $control_buttons_container_bgColor_extra_small:
    darkColorScheme.$primary_accent_purple,
  $control_buttons_container_bgColor_extra_small_active:
    darkColorScheme.$primary_accent_purple,
  $control_buttons_container_outlineColor:
    darkColorScheme.$primary_accent_purple_0_3,
  $control_buttons_borderColor: darkColorScheme.$primary_dark_grey_plus,
  $control_buttons_borderColor_danger:
    darkColorScheme.$primary_accent_purple_0_3,

  $variants_table_bgColor: '#1E1E1E',
  $variants_table_borderColor: 'rgba(255, 255, 255, 0.07)',

  $divider_bgColor: darkColorScheme.$primary_mid_grey,

  $bundle_input_container_bgColor: darkColorScheme.$primary_dark_grey,
  $bundle_input_secondary_label_color: darkColorScheme.$primary_light_grey,

  $bundle_input_max_button_container_bgColor: darkColorScheme.$primary_grey,
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

  $sub_navigation_container_borderColor: darkColorScheme.$primary_mid_grey,

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

  $toggle_switch_container_bgColor_on: darkColorScheme.$primary_mid_grey,
  $toggle_switch_container_bgColor_off: darkColorScheme.$primary_accent_purple,
  $toggle_switch_container_bgColor_disabled:
    darkColorScheme.$primary_light_grey,
  $toggle_switch_container_outline: lightColorScheme.$primary_accent_purple_0_3,
  $toggle_switch_thumb_bgColor: darkColorScheme.$primary_white,

  $assets_table_container_bgColor_hover: darkColorScheme.$primary_mid_grey,

  $dialog_container_bgColor: darkColorScheme.$primary_light_black,
  $dialog_description_color: darkColorScheme.$primary_light_grey,

  $side_drawer_container_bgColor: darkColorScheme.$primary_light_black,
  $side_drawer_separator_bgColor: darkColorScheme.$primary_mid_grey,
  $side_drawer_content_title_color: darkColorScheme.$primary_white,

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

  $icon_button_label_color: darkColorScheme.$primary_light_grey,
  $icon_button_label_color_pressed: darkColorScheme.$primary_white,
  $icon_button_container_bgColor: colorTransparent,
  $icon_button_container_bgColor_hover: darkColorScheme.$primary_mid_grey,
  $icon_button_container_bgColor_pressed: darkColorScheme.$primary_dark_grey,
  $icon_button_container_outlineColor:
    darkColorScheme.$primary_accent_purple_0_3,

  $summary_expander_container_borderColor: darkColorScheme.$primary_mid_grey,
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

  $transaction_summary_secondary_label_color:
    darkColorScheme.$primary_light_grey,

  $dapp_transaction_summary_type_label_color:
    darkColorScheme.$primary_accent_purple,

  $toast_bar_container_bgColor: darkColorScheme.$primary_dark_grey,
  $toast_bar_icon_container_bgColor: darkColorScheme.$primary_grey,
  $toast_bar_icon_label_color: darkColorScheme.$primary_light_grey_plus,

  $tooltip_container_bgColor: darkColorScheme.$primary_mid_grey,
  $tooltip_title_dot_bgColor: darkColorScheme.$primary_accent_purple,

  $input_container_bgColor: darkColorScheme.$primary_dark_grey,
  $input_container_hover_outline_color: darkColorScheme.$primary_grey,
  $input_container_focused_outline_color:
    darkColorScheme.$secondary_hover_purple,
  $input_value_color: darkColorScheme.$primary_white,
  $input_button_bgColor: darkColorScheme.$primary_grey,
  $input_button_icon_color: darkColorScheme.$primary_light_grey,
  $input_label_color: darkColorScheme.$primary_light_grey,

  $text_primary: darkColorScheme.$primary_white,
  $text_secondary: darkColorScheme.$primary_light_grey,
  $text_on_gradient: darkColorScheme.$primary_white,
  $text_accent: darkColorScheme.$primary_accent_purple,

  $metadata_secondary_label_color: darkColorScheme.$primary_light_grey,

  $text_link_label_color_visited: darkColorScheme.$primary_accent_purple,
  $text_link_label_color_disabled: lightColorScheme.$primary_grey,

  $profile_dropdown_trigger_label_color: darkColorScheme.$primary_light_grey,
  $profile_dropdown_trigger_label_color_pressed:
    darkColorScheme.$primary_light_grey,
  $profile_dropdown_trigger_container_borderColor:
    darkColorScheme.$primary_mid_grey,
  $profile_dropdown_trigger_container_bgColor: colorTransparent,
  $profile_dropdown_trigger_container_bgColor_hover:
    darkColorScheme.$primary_light_black,
  $profile_dropdown_trigger_container_bgColor_pressed:
    darkColorScheme.$primary_mid_grey,
  $profile_dropdown_trigger_container_outlineColor:
    darkColorScheme.$primary_accent_purple_0_3,

  $profile_dropdown_wallet_option_container_bgColor_hover:
    darkColorScheme.$primary_mid_grey,
  $profile_dropdown_wallet_option_container_bgColor_pressed:
    darkColorScheme.$primary_dark_grey,
  $profile_dropdown_wallet_option_container_outlineColor:
    darkColorScheme.$primary_accent_purple_0_3,
  $profile_dropdown_wallet_option_label_color:
    darkColorScheme.$primary_light_grey,

  $profile_dropdown_wallet_status_container_borderColor:
    darkColorScheme.$primary_mid_grey,

  $profile_dropdown_account_item_container_bgColor_hover:
    darkColorScheme.$primary_mid_grey,
  $profile_dropdown_account_item_container_bgColor_pressed:
    darkColorScheme.$primary_dark_grey,
  $profile_dropdown_account_item_container_focus_outlineColor:
    darkColorScheme.$primary_accent_purple_0_3,
  $profile_dropdown_account_item_edit_icon_color:
    darkColorScheme.$primary_accent_purple,
  $profile_dropdown_account_item_delete_icon_color:
    darkColorScheme.$secondary_data_pink,

  $data_blue: darkColorScheme.$secondary_data_blue,
  $data_green: darkColorScheme.$secondary_data_green,
  $data_pink: darkColorScheme.$secondary_data_pink,
  $data_yellow: darkColorScheme.$secondary_lace_yellow,
  $data_orange: darkColorScheme.$secondary_data_orange,

  $educational_card_root_container_bgColor: darkColorScheme.$primary_mid_black,
  $educational_card_root_container_borderColor: colorTransparent,

  $educational_card_item_container_bgColor: colorTransparent,
  $educational_card_item_container_bgColor_hover:
    darkColorScheme.$primary_mid_grey,
  $educational_card_item_container_bgColor_pressed:
    darkColorScheme.$primary_dark_grey,
  $educational_card_item_container_outlineColor:
    darkColorScheme.$primary_accent_purple_0_3,
  $educational_card_item_icon_container_bgColor:
    darkColorScheme.$primary_dark_grey_plus,
  $educational_card_item_icon_container_borderColor: colorTransparent,

  $file_upload_container_bgColor: darkColorScheme.$primary_mid_black,
  $file_upload_container_bgColor_hover: darkColorScheme.$primary_mid_grey,
  $file_upload_container_bgColor_pressed: darkColorScheme.$primary_dark_grey,
  $file_upload_container_bgColor_focused: darkColorScheme.$primary_mid_black,
  $file_upload_container_outlineColor:
    darkColorScheme.$primary_accent_purple_0_3,
  $file_upload_container_borderColor: colorTransparent,

  $file_upload_icon_container_bgColor: darkColorScheme.$primary_dark_grey_plus,
  $file_upload_icon_container_borderColor: colorTransparent,

  $checkbox_check_color: darkColorScheme.$primary_black,
  $checkbox_checked_backgroundColor: darkColorScheme.$primary_accent_purple,
  $checkbox_unchecked_backgroundColor: colorTransparent,
  $checkbox_unchecked_borderColor: darkColorScheme.$primary_light_grey,
  $checkbox_focus_color: darkColorScheme.$primary_accent_purple_0_3,
  $checkbox_hover_unchecked_borderColor: darkColorScheme.$primary_light_grey,
  $checkbox_hover_unchecked_backgroundColor: darkColorScheme.$primary_dark_grey,
  $checkbox_hover_checked_backgroundColor:
    darkColorScheme.$primary_hover_purple,

  $radiobutton_focus_color: lightColorScheme.$primary_accent_purple_0_3,
  $radiobutton_hover_color: darkColorScheme.$primary_light_grey,
  $radiobutton_indicator_backgroundColor:
    darkColorScheme.$primary_accent_purple,
  $radiobutton_indicator_check_color: darkColorScheme.$primary_mid_black,
  $radiobutton_unchecked_borderColor: lightColorScheme.$primary_grey,
  $radiobutton_unchecked_bgColor: 'transparent',
  $radiobutton_checked_bgColor: darkColorScheme.$primary_grey,
  $radiobutton_icon_color: 'transparent',
  $radiobutton_icon_active: darkColorScheme.$primary_light_black,
  $radiobutton_icon_active_border_color: darkColorScheme.$primary_light_black,
  $radiobutton_icon_text_color: darkColorScheme.$primary_white,
  $radiobutton_icon_disabled_border_color: darkColorScheme.$primary_mid_grey,
  $radiobutton_icon_hover_color: darkColorScheme.$primary_dark_grey,
  $radiobutton_icon_hover_border_color: darkColorScheme.$primary_mid_grey,

  $select_grey_bgColor_rest: darkColorScheme.$primary_light_black,
  $select_grey_bgColor_hover: darkColorScheme.$primary_grey,
  $select_grey_bgColor_pressed: darkColorScheme.$primary_grey,
  $select_grey_content_bgColor: darkColorScheme.$primary_light_black,
  $select_plain_bgColor_rest: darkColorScheme.$primary_bg_black,
  $select_plain_bgColor_hover: darkColorScheme.$primary_mid_grey,
  $select_plain_bgColor_pressed: darkColorScheme.$primary_mid_grey,
  $select_plain_content_bgColor: darkColorScheme.$primary_bg_black,
  $select_outline_bgColor_rest: darkColorScheme.$primary_bg_black,
  $select_outline_bgColor_hover: darkColorScheme.$primary_mid_grey,
  $select_outline_bgColor_pressed: darkColorScheme.$primary_mid_grey,
  $select_outline_content_bgColor: darkColorScheme.$primary_bg_black,
  $select_outline_border_color: darkColorScheme.$primary_mid_grey,
  $select_text_color: darkColorScheme.$primary_white,
  $select_placeholder_text_color: darkColorScheme.$primary_light_grey,

  $action_card_container_bgColor: darkColorScheme.$primary_mid_black,
  $action_card_container_bgColor_hover: darkColorScheme.$primary_mid_grey,
  $action_card_container_bgColor_pressed: darkColorScheme.$primary_dark_grey,
  $action_card_container_bgColor_focused: darkColorScheme.$primary_mid_black,
  $action_card_container_outlineColor:
    darkColorScheme.$primary_accent_purple_0_3,
  $action_card_container_borderColor: colorTransparent,
  $action_card_icon_container_bgColor: darkColorScheme.$primary_dark_grey_plus,
  $action_card_icon_container_borderColor: colorTransparent,

  $auto_suggest_container_background_color: darkColorScheme.$primary_dark_grey,
  $auto_suggest_border_color: darkColorScheme.$primary_grey,
  $auto_suggest_loader_color: darkColorScheme.$primary_accent_purple,
  $auto_suggest_check_color: darkColorScheme.$secondary_data_green,
  $auto_suggest_address_color: darkColorScheme.$primary_light_grey,
  $auto_suggest_initial_bgColor: darkColorScheme.$primary_accent_purple_0_3,
  $auto_suggest_initial_color: darkColorScheme.$primary_accent_purple,

  $stake_pool_item_bg_hover: darkColorScheme.$primary_dark_grey_plus,
  $stake_pool_header_text_color: darkColorScheme.$primary_white,
  $stake_pool_item_text_color: darkColorScheme.$primary_light_grey,

  $info_bar_container_bgColor: darkColorScheme.$primary_dark_grey_plus,
  $info_bar_icon_color: darkColorScheme.$secondary_data_pink,
  $info_bar_message_color: darkColorScheme.$primary_light_grey,

  $address_tag_own_color: darkColorScheme.$secondary_data_pink,
  $address_tag_own_bgColor: rgba(darkColorScheme.$secondary_data_pink, 0.1),
  $address_tag_handle_color: darkColorScheme.$primary_accent_purple,
  $address_tag_handle_bgColor: rgba(
    darkColorScheme.$primary_accent_purple,
    0.1,
  ),
  $address_tag_foreign_color: darkColorScheme.$primary_dark_grey,
  $address_tag_foreign_bgColor: darkColorScheme.$primary_light_grey,
};

const elevation: Elevation = {
  $tooltip: 'none',
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
