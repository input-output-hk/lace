import { darkColorScheme, laceGradient, lightColorScheme } from '@input-output-hk/lace-ui-toolkit';

export const colorsContract = {
  $activityNoActivityTextColor: '',
  $bannerBellIconColor: '',
  $bannerInfoIconColor: '',
  $browsePoolsFilterInputRightBorderColor: '',
  $browsePoolsSearchEmptyTextColor: '',
  $dataGreenGradient: '',
  $dataOrangeGradient: '',
  $dataPinkGradient: '',
  $delegationCardInfoLabelColor: '',
  $delegationCardInfoValueColor: '',
  $delegationCardWarningValueColor: '',
  $drawerBackgroundColor: '',
  $getStartedStepBorderColor: '',
  $getStartedStepDescriptionColor: '',
  $getStartedStepFillColor: '',
  $getStartedStepNumberColor: '',
  $multidelegationBetaModalPillBackground: '',
  $multidelegationBetaModalPillText: '',
  $poolCardMetricColor: '',
  $poolCardProgressBarBaseBackgroundColor: '',
  $poolCardProgressBarValue: '',
  $poolCardSelectedBorderColor: '',
  $poolItemEvenBackground: '',
  $preferencesDrawerNoPoolsTextColor: '',
  $preferencesPoolCardBorderColor: '',
  $preferencesPoolCardDataIconColor: '',
  $preferencesPoolCardDataTextColor: '',
  $qrCodeBackground: '',
  $qrCodeForeground: '',
  $ratioInputContainerBgColor: '',
  $ratioInputContainerHoverOutlineColor: '',
  $ratioInputValueColor: '',
  $selectedPoolsSectionBorderColor: '',
  $sliderFillPrimary: '',
  $sliderFillSecondary: '',
  $sliderKnobFill: '',
  $sliderRailFill: '',
  $stakePoolCellPlaceholder: '',
  $stakePoolGridSeparatorColor: '',
  $stakePoolListCellDotHighColor: '',
  $stakePoolListCellDotMediumColor: '',
  $stakePoolListCellDotVeryHighColor: '',
  $stakePoolListPlaceholderCheckboxColor: '',
  $titleColor: '',
  $tooltipBgColor: '',
};

export const lightThemeColors: typeof colorsContract = {
  $activityNoActivityTextColor: lightColorScheme.$primary_dark_grey,
  $bannerBellIconColor: lightColorScheme.$primary_accent_purple,
  $bannerInfoIconColor: lightColorScheme.$primary_accent_purple,
  $browsePoolsFilterInputRightBorderColor: lightColorScheme.$primary_light_grey_plus,
  $browsePoolsSearchEmptyTextColor: lightColorScheme.$primary_dark_grey,
  $dataGreenGradient: `linear-gradient(to right, ${lightColorScheme.$secondary_data_green}, ${lightColorScheme.$secondary_data_green})`,
  $dataOrangeGradient: `linear-gradient(to right, ${lightColorScheme.$secondary_data_orange}, ${lightColorScheme.$secondary_data_orange})`,
  $dataPinkGradient: `linear-gradient(to right, ${lightColorScheme.$secondary_data_pink}, ${lightColorScheme.$secondary_data_pink})`,
  $delegationCardInfoLabelColor: lightColorScheme.$primary_dark_grey,
  $delegationCardInfoValueColor: lightColorScheme.$primary_black,
  $delegationCardWarningValueColor: lightColorScheme.$secondary_data_pink,
  $drawerBackgroundColor: lightColorScheme.$primary_white,
  $getStartedStepBorderColor: lightColorScheme.$primary_light_grey_plus,
  $getStartedStepDescriptionColor: lightColorScheme.$primary_dark_grey,
  $getStartedStepFillColor: 'transparent',
  $getStartedStepNumberColor: laceGradient,
  $multidelegationBetaModalPillBackground: laceGradient,
  $multidelegationBetaModalPillText: lightColorScheme.$primary_white,
  $poolCardMetricColor: lightColorScheme.$primary_grey,
  $poolCardProgressBarBaseBackgroundColor: lightColorScheme.$primary_light_grey_plus,
  $poolCardProgressBarValue: lightColorScheme.$primary_grey,
  $poolCardSelectedBorderColor: lightColorScheme.$primary_accent_purple,
  $poolItemEvenBackground: lightColorScheme.$primary_light_grey_0_56,
  $preferencesDrawerNoPoolsTextColor: lightColorScheme.$primary_dark_grey,
  $preferencesPoolCardBorderColor: lightColorScheme.$primary_light_grey_plus,
  $preferencesPoolCardDataIconColor: lightColorScheme.$primary_grey,
  $preferencesPoolCardDataTextColor: lightColorScheme.$primary_dark_grey,
  $qrCodeBackground: lightColorScheme.$primary_white,
  $qrCodeForeground: lightColorScheme.$primary_black,
  $ratioInputContainerBgColor: lightColorScheme.$primary_light_grey,
  $ratioInputContainerHoverOutlineColor: lightColorScheme.$primary_light_grey_plus,
  $ratioInputValueColor: lightColorScheme.$primary_black,
  $selectedPoolsSectionBorderColor: lightColorScheme.$primary_light_grey_plus_0_56,
  $sliderFillPrimary: lightColorScheme.$primary_accent_purple,
  $sliderFillSecondary: lightColorScheme.$primary_dark_grey,
  $sliderKnobFill: lightColorScheme.$primary_white,
  $sliderRailFill: lightColorScheme.$primary_light_grey_plus,
  $stakePoolCellPlaceholder: lightColorScheme.$primary_light_grey,
  $stakePoolGridSeparatorColor: lightColorScheme.$primary_light_grey_plus,
  $stakePoolListCellDotHighColor: lightColorScheme.$secondary_data_orange,
  $stakePoolListCellDotMediumColor: lightColorScheme.$secondary_data_green,
  $stakePoolListCellDotVeryHighColor: darkColorScheme.$secondary_data_pink,
  $stakePoolListPlaceholderCheckboxColor: lightColorScheme.$primary_grey,
  $titleColor: lightColorScheme.$primary_dark_grey,
  $tooltipBgColor: lightColorScheme.$primary_white,
};

export const darkThemeColors: typeof colorsContract = {
  $activityNoActivityTextColor: darkColorScheme.$primary_light_grey,
  $bannerBellIconColor: darkColorScheme.$primary_accent_purple,
  $bannerInfoIconColor: darkColorScheme.$primary_accent_purple,
  $browsePoolsFilterInputRightBorderColor: darkColorScheme.$primary_grey,
  $browsePoolsSearchEmptyTextColor: darkColorScheme.$primary_light_grey,
  $dataGreenGradient: `linear-gradient(to right, ${darkColorScheme.$secondary_data_green}, ${darkColorScheme.$secondary_data_green})`,
  $dataOrangeGradient: `linear-gradient(to right, ${darkColorScheme.$secondary_data_orange}, ${darkColorScheme.$secondary_data_orange})`,
  $dataPinkGradient: `linear-gradient(to right, ${darkColorScheme.$secondary_data_pink}, ${darkColorScheme.$secondary_data_pink})`,
  $delegationCardInfoLabelColor: darkColorScheme.$primary_light_grey,
  $delegationCardInfoValueColor: darkColorScheme.$primary_white,
  $delegationCardWarningValueColor: darkColorScheme.$secondary_data_pink,
  $drawerBackgroundColor: darkColorScheme.$primary_light_black,
  $getStartedStepBorderColor: darkColorScheme.$primary_mid_black,
  $getStartedStepDescriptionColor: darkColorScheme.$primary_light_grey,
  $getStartedStepFillColor: darkColorScheme.$primary_mid_black,
  $getStartedStepNumberColor: laceGradient,
  $multidelegationBetaModalPillBackground: laceGradient,
  $multidelegationBetaModalPillText: darkColorScheme.$primary_white,
  $poolCardMetricColor: darkColorScheme.$primary_light_grey,
  $poolCardProgressBarBaseBackgroundColor: darkColorScheme.$primary_dark_grey_plus,
  $poolCardProgressBarValue: darkColorScheme.$primary_light_grey,
  $poolCardSelectedBorderColor: darkColorScheme.$primary_accent_purple,
  $poolItemEvenBackground: darkColorScheme.$primary_light_black,
  $preferencesDrawerNoPoolsTextColor: darkColorScheme.$primary_light_grey,
  $preferencesPoolCardBorderColor: darkColorScheme.$primary_mid_black,
  // TODO: use darkColorScheme instead
  $preferencesPoolCardDataIconColor: lightColorScheme.$primary_grey,
  // TODO: use darkColorScheme instead
  $preferencesPoolCardDataTextColor: lightColorScheme.$primary_dark_grey,
  // TODO: use darkColorScheme instead
  $qrCodeBackground: lightColorScheme.$primary_black,
  // TODO: use darkColorScheme instead
  $qrCodeForeground: lightColorScheme.$primary_white,
  $ratioInputContainerBgColor: darkColorScheme.$primary_dark_grey,
  $ratioInputContainerHoverOutlineColor: darkColorScheme.$primary_grey,
  $ratioInputValueColor: darkColorScheme.$primary_white,
  $selectedPoolsSectionBorderColor: darkColorScheme.$primary_dark_grey,
  $sliderFillPrimary: darkColorScheme.$primary_accent_purple,
  $sliderFillSecondary: darkColorScheme.$primary_light_grey,
  $sliderKnobFill: lightColorScheme.$primary_black,
  $sliderRailFill: darkColorScheme.$primary_dark_grey_plus,
  $stakePoolCellPlaceholder: darkColorScheme.$primary_mid_grey,
  $stakePoolGridSeparatorColor: darkColorScheme.$primary_mid_grey,
  $stakePoolListCellDotHighColor: darkColorScheme.$secondary_data_orange,
  $stakePoolListCellDotMediumColor: darkColorScheme.$secondary_data_green,
  $stakePoolListCellDotVeryHighColor: darkColorScheme.$secondary_data_pink,
  $stakePoolListPlaceholderCheckboxColor: darkColorScheme.$primary_light_grey,
  $titleColor: darkColorScheme.$primary_light_grey,
  $tooltipBgColor: darkColorScheme.$primary_mid_grey,
};
