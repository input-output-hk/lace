import type { Theme } from './types';

export const darkTheme: Theme = {
  name: 'dark',
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
    page: '#1E1E1E',
    primary: '#00000099',
    primarySolid: '#000000',
    secondary: '#FFFFFF0D',
    tertiary: '#FFFFFF14',
    overlay: '#202020CC',
    positive: '#008080',
    negative: '#E01E5A',
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#EFEFEF',
    tertiary: '#CCCCCC',
  },
  border: {
    top: '#EEEEEE1A',
    middle: '#33333333',
    bottom: '#1111111A',
    focused: '#FFFFFF59',
  },
  shadow: {
    drop: '#99999914',
    inner: '#FFFFFF33',
  },
  data: {
    positive: '#5AC64C',
    negative: '#E01E5A',
  },
  extra: {
    chathamsBlue: '#1D428C',
    fancyBorder: 'rgba(51, 51, 51, 0.20)',
    shadowDrop: `rgba(153, 153, 153, 0.08)`,
    shadowInner: 'rgba(255, 255, 255, 0.20)',
    shadowInnerStrong: 'rgba(255, 255, 255, 0.35)',
  },
  typography: {
    fontFamily: 'primary',
  },
  icons: {
    background: '#EFEFEF',
  },
};
