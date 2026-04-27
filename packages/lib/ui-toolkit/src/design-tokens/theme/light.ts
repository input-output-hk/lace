import type { Theme } from './types';

export const lightTheme: Theme = {
  name: 'light',
  brand: {
    ascending: '#8B2BEC',
    ascendingSecondary: '#BF97E8',
    support: '#4A1DD8',
    supportSecondary: '#9985D6',
    pinkish: '#F5759E',
    pinkishSecondary: '#F2A7BF',
    salmon: '#FF9D7B',
    yellow: '#F2BA00',
    yellowSecondary: '#FCDC7A',
    orange: '#FE890B',
    white: '#EFEFEF',
    lightGray: '#CCCCCC',
    darkGray: '#595959',
    black: '#1E1E1E',
  },
  background: {
    page: '#EFEFEF',
    primary: '#FFFFFF99',
    primarySolid: '#FFFFFF',
    secondary: '#0000000D',
    tertiary: '#00000014',
    overlay: '#F3F3F3CC',
    positive: '#008080',
    negative: '#E01E5A',
  },
  text: {
    primary: '#1E1E1E',
    secondary: '#444444',
    tertiary: '#777777',
  },
  border: {
    top: '#0000001A',
    middle: '#DDDDDD33',
    bottom: '#CCCCCC1A',
    focused: '#AAAAAA59',
  },
  shadow: {
    drop: '#33333314',
    inner: '#CCCCCC33',
  },
  data: {
    positive: '#5AC64C',
    negative: '#E01E5A',
  },
  extra: {
    chathamsBlue: '#1D428C',
    fancyBorder: 'rgba(51, 51, 51, 0.20)',
    shadowDrop: 'rgba(51, 51, 51, 0.08)',
    shadowInner: 'rgba(204, 204, 204, 0.20)',
    shadowInnerStrong: 'rgba(170, 170, 170, 0.35)',
  },
  typography: {
    fontFamily: 'primary',
  },
  icons: {
    background: '#1E1E1E',
  },
};
