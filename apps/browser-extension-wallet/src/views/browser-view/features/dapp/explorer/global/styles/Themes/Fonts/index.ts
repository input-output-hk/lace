import { IFonts } from './types';

export const fonts: IFonts['fonts'] = {
  fontFamily: 'D-DIN',
  bigTitle: {
    fontSize: 60,
    lineHeight: 72
  },
  bigTitleAlt: {
    fontSize: 48,
    lineHeight: 58
  },
  h1: {
    fontSize: 35,
    lineHeight: 42
  },
  h2: {
    fontSize: 29,
    lineHeight: 35
  },
  h3: {
    fontSize: 24,
    lineHeight: 28.8
  },
  h4: {
    fontSize: 20,
    lineHeight: 24
  },
  h5: {
    fontSize: 16,
    lineHeight: 20
  },
  h6: {
    fontSize: 14,
    lineHeight: 14
  },
  subTitle: {
    fontSize: 16,
    lineHeight: 20
  },
  subTitleAlt: {
    fontSize: 14,
    lineHeight: 16.8
  },
  captionAlt: {
    fontSize: 10,
    lineHeight: 10
  },
  bodyAlt: {
    fontSize: 12,
    lineHeight: 14.4
  },
  weight: {
    normal: 300,
    medium: 500,
    bold: 700
  },
  uppercase: 'uppercase',
  lowercase: 'lowercase',
  capitalize: 'capitalize',
  lineColor: {
    base: '#FFCE09',
    light: 'rgba(255, 255, 255, 0.5)',
    dark: 'rgba(0, 0, 0, 0.5)'
  },
  addImportantTag(important: boolean): string {
    return important ? '!important' : '';
  },
  setFontWeight(wheight, important = false) {
    return ` font-weight: ${this.weight[wheight]}${this.addImportantTag(important)};`;
  },
  setHeadingLineColor(color) {
    if (!color) return '';
    return `background: ${this.lineColor[color]};`;
  }
};
