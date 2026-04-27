/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

const fontMap = {
  'BrandonGrotesque-Medium': require('../../assets/fonts/BrandonGrotesque-Medium.otf'),
  'ProximaNova-Medium': require('../../assets/fonts/ProximaNova-Medium.ttf'),
} as const satisfies Record<string, number>;

export type FontAssetKey = keyof typeof fontMap;

export const laceFontAssets: Record<string, number> = fontMap;
