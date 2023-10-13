import { darkColorScheme, laceGradient, lightColorScheme, vars } from '@lace/ui';

export const colorsContract = {
  $activityNoActivityTextColor: '',
  $bannerBellIconColor: '',
  $bannerInfoIconColor: '',
  $browsePoolsFilterInputRightBorderColor: '',
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
  $stakePoolListPlaceholderCheckboxColor: '',
  $titleColor: '',
  $tooltipBgColor: '',
};

export const lightThemeColors: typeof colorsContract = {
  $activityNoActivityTextColor: lightColorScheme.$primary_dark_grey,
  $bannerBellIconColor: lightColorScheme.$primary_accent_purple,
  $bannerInfoIconColor: lightColorScheme.$primary_accent_purple,
  $browsePoolsFilterInputRightBorderColor: lightColorScheme.$primary_light_grey_plus,
  $dataGreenGradient: `linear-gradient(to right, ${vars.colors.$data_green}, ${vars.colors.$data_green})`,
  $dataOrangeGradient: `linear-gradient(to right, ${vars.colors.$data_orange}, ${vars.colors.$data_orange})`,
  $dataPinkGradient: `linear-gradient(to right, ${vars.colors.$data_pink}, ${vars.colors.$data_pink})`,
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
  $stakePoolListPlaceholderCheckboxColor: lightColorScheme.$primary_grey,
  $titleColor: lightColorScheme.$primary_dark_grey,
  $tooltipBgColor: lightColorScheme.$primary_white,
};

export const darkThemeColors: typeof colorsContract = {
  $activityNoActivityTextColor: darkColorScheme.$primary_light_grey,
  $bannerBellIconColor: darkColorScheme.$primary_accent_purple,
  $bannerInfoIconColor: darkColorScheme.$primary_accent_purple,
  $browsePoolsFilterInputRightBorderColor: darkColorScheme.$primary_grey,
  $dataGreenGradient: `linear-gradient(to right, ${vars.colors.$data_green}, ${vars.colors.$data_green})`,
  $dataOrangeGradient: `linear-gradient(to right, ${vars.colors.$data_orange}, ${vars.colors.$data_orange})`,
  $dataPinkGradient: `linear-gradient(to right, ${vars.colors.$data_pink}, ${vars.colors.$data_pink})`,
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
  $stakePoolListPlaceholderCheckboxColor: darkColorScheme.$primary_light_grey,
  $titleColor: darkColorScheme.$primary_light_grey,
  $tooltipBgColor: darkColorScheme.$primary_mid_grey,
};
