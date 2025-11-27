/* eslint-disable no-magic-numbers */
export type FontWeightTypes = keyof IFonts['fonts']['weight'];
export type HeadingLineColorTypes = keyof IFonts['fonts']['lineColor'];
export interface IFonts {
  fonts: {
    fontFamily: string;
    bigTitle: {
      fontSize: number;
      lineHeight: number;
    };
    bigTitleAlt: {
      fontSize: number;
      lineHeight: number;
    };
    subTitle: {
      fontSize: number;
      lineHeight: number;
    };
    subTitleAlt: {
      fontSize: number;
      lineHeight: number;
    };
    captionAlt: {
      fontSize: number;
      lineHeight: number;
    };
    h1: {
      fontSize: number;
      lineHeight: number;
    };
    h2: {
      fontSize: number;
      lineHeight: number;
    };
    h3: {
      fontSize: number;
      lineHeight: number;
    };
    h4: {
      fontSize: number;
      lineHeight: number;
    };
    h5: {
      fontSize: number;
      lineHeight: number;
    };
    h6: {
      fontSize: number;
      lineHeight: number;
    };
    bodyAlt: {
      fontSize: number;
      lineHeight: number;
    };
    weight: {
      normal: 300;
      medium: 500;
      bold: 700;
    };
    lineColor: {
      base: '#FFCE09';
      light: 'rgba(255, 255, 255, 0.5)';
      dark: 'rgba(0, 0, 0, 0.5)';
    };
    uppercase: 'uppercase';
    lowercase: 'lowercase';
    capitalize: 'capitalize';
    addImportantTag(value: boolean): string;
    setFontWeight: (wheight: FontWeightTypes) => string;
    setHeadingLineColor: (color: HeadingLineColorTypes) => string;
  };
}
