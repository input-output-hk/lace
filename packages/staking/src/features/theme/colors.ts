import { darkColorScheme, laceGradient, lightColorScheme } from '@lace/ui';

export const colorsContract = {
  $bannerInfoIconColor: '',
  $delegationCardInfoLabelColor: '',
  $delegationCardInfoValueColor: '',
  $getStartedStepBorderColor: '',
  $getStartedStepDescriptionColor: '',
  $getStartedStepFillColor: '',
  $getStartedStepNumberColor: '',
  $multidelegationBetaModalPillBackground: '',
  $multidelegationBetaModalPillText: '',
  $qrCodeBackground: '',
  $qrCodeForeground: '',
};

export const lightThemeColors: typeof colorsContract = {
  $bannerInfoIconColor: lightColorScheme.$primary_accent_purple,
  $delegationCardInfoLabelColor: lightColorScheme.$primary_dark_grey,
  $delegationCardInfoValueColor: lightColorScheme.$primary_black,
  $getStartedStepBorderColor: lightColorScheme.$primary_light_grey_plus,
  $getStartedStepDescriptionColor: lightColorScheme.$primary_dark_grey,
  $getStartedStepFillColor: 'transparent',
  $getStartedStepNumberColor: laceGradient,
  $multidelegationBetaModalPillBackground: laceGradient,
  $multidelegationBetaModalPillText: lightColorScheme.$primary_white,
  $qrCodeBackground: lightColorScheme.$primary_white,
  $qrCodeForeground: lightColorScheme.$primary_black,
};

export const darkThemeColors: typeof colorsContract = {
  $bannerInfoIconColor: lightColorScheme.$primary_accent_purple,
  $delegationCardInfoLabelColor: darkColorScheme.$primary_light_grey,
  $delegationCardInfoValueColor: darkColorScheme.$primary_white,
  $getStartedStepBorderColor: darkColorScheme.$primary_mid_black,
  $getStartedStepDescriptionColor: darkColorScheme.$primary_light_grey,
  $getStartedStepFillColor: darkColorScheme.$primary_mid_black,
  $getStartedStepNumberColor: laceGradient,
  $multidelegationBetaModalPillBackground: laceGradient,
  $multidelegationBetaModalPillText: lightColorScheme.$primary_white,
  $qrCodeBackground: lightColorScheme.$primary_black,
  $qrCodeForeground: lightColorScheme.$primary_white,
};
