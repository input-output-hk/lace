import { darkColorScheme, laceGradient, lightColorScheme } from '@lace/ui';

export const colorsContract = {
  $delegationCardInfoLabelColor: '',
  $delegationCardInfoValueColor: '',
  $multidelegationBetaModalPillBackground: '',
  $multidelegationBetaModalPillText: '',
};

export const lightThemeColors: typeof colorsContract = {
  $delegationCardInfoLabelColor: lightColorScheme.$primary_dark_grey,
  $delegationCardInfoValueColor: lightColorScheme.$primary_black,
  $multidelegationBetaModalPillBackground: laceGradient,
  $multidelegationBetaModalPillText: lightColorScheme.$primary_white,
};

export const darkThemeColors: typeof colorsContract = {
  $delegationCardInfoLabelColor: darkColorScheme.$primary_light_grey,
  $delegationCardInfoValueColor: darkColorScheme.$primary_white,
  $multidelegationBetaModalPillBackground: laceGradient,
  $multidelegationBetaModalPillText: lightColorScheme.$primary_white,
};
