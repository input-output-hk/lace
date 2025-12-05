type RGB = `rgb(${number}, ${number}, ${number})`;
type RGBA = `rgba(${number}, ${number}, ${number}, ${number})`;
type HEX = `#${string}`;

type Color = RGB | RGBA | HEX;

export type themes = 'light' | 'dark';
export type ThemeInstance = {
  name: themes;
  fonts: {
    fontSizes: number[];
    bodySmall: number;
    body: number;
    bodyLarge: number;
    subHeading: number;
    heading: number;
    pageHeading: number;
    display: number;
  };
  colors: {
    bg: {
      body: Color;
      container: Color;
    };
    primary: {
      orange: Color;
      purple: Color;
    };
    secondary: {
      yellow: Color;
      cyan: Color;
      magnolia: Color;
      black: Color;
      white: Color;
    };
    data: {
      green: Color;
      red: Color;
      blue: Color;
      lgray: Color;
      mgrey: Color;
      dgrey: Color;
    };
    text: {
      primary: Color;
      black: Color;
      grey: Color;
      blue: Color;
      red: Color;
    };
  };
};

export type Theme = Record<themes, ThemeInstance>;
