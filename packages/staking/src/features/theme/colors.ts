import { darkColorScheme, lightColorScheme } from '@lace/ui';

export const colorsContract = {
  $delegationCardInfoLabelColor: '',
  $delegationCardInfoValueColor: '',
};

export const lightThemeColors: typeof colorsContract = {
  $delegationCardInfoLabelColor: lightColorScheme.$primary_dark_grey,
  $delegationCardInfoValueColor: lightColorScheme.$primary_black,
};

export const darkThemeColors: typeof colorsContract = {
  $delegationCardInfoLabelColor: darkColorScheme.$primary_light_grey,
  $delegationCardInfoValueColor: darkColorScheme.$primary_white,
};
