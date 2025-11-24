/* eslint-disable no-magic-numbers */
import type { ThemeInstance, Theme } from './types';

const fontSizes = [14, 16, 18, 25, 32, 46, 58];

// TODO: generate ranges using some kind of config file LW-5250
const theme: ThemeInstance = {
  name: 'light',
  fonts: {
    fontSizes,
    bodySmall: fontSizes[0],
    body: fontSizes[1],
    bodyLarge: fontSizes[2],
    subHeading: fontSizes[3],
    heading: fontSizes[4],
    pageHeading: fontSizes[5],
    display: fontSizes[6]
  },
  // TODO: generate ranges using some kind of config file LW-5250
  colors: {
    bg: {
      body: '#ffffff',
      container: '#ffffff'
    },
    primary: {
      orange: '#fc6133',
      purple: '#702bed'
    },
    secondary: {
      yellow: '#ffc72e',
      cyan: '#2bf2c4',
      magnolia: '#fcf5e3',
      black: '#3D3B39',
      white: '#FFFFFF'
    },
    data: {
      green: '#22A892',
      red: '#fc3333',
      blue: '#0000ee',
      lgray: '#F9F9F9',
      mgrey: '#e8e8e8',
      dgrey: '#797979'
    },
    text: {
      primary: '#3d3b39',
      black: '#212121',
      grey: '#6B7280',
      blue: '#3489F7',
      red: '#DD2C00'
    }
  }
};
export const defaultTheme: Theme = {
  light: theme,
  // TODO: define theme LW-5250
  dark: {
    ...theme,
    name: 'dark',
    colors: {
      ...theme.colors,
      bg: {
        body: '#1e1e1e',
        container: '#252525'
      },
      text: {
        ...theme.colors.text,
        primary: '#ffffff'
      }
    }
  }
};
