import React from 'react';

import { ChakraProvider, extendTheme } from '@chakra-ui/react';
import './app/components/styles.css';
import '@fontsource/ubuntu/latin.css';

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const colorMode = localStorage['chakra-ui-color-mode'];

const inputSizes = {
  sm: {
    borderRadius: 'lg',
  },
  md: {
    borderRadius: 'lg',
  },
};

const Input = {
  sizes: {
    sm: {
      field: inputSizes.sm,
      addon: inputSizes.sm,
    },
    md: {
      field: inputSizes.md,
      addon: inputSizes.md,
    },
  },
  defaultProps: {
    focusBorderColor: 'teal.500',
  },
};

const Checkbox = {
  defaultProps: {
    colorScheme: 'teal',
  },
};

const Select = {
  defaultProps: {
    focusBorderColor: 'teal.500',
  },
};

const Button = {
  baseStyle: {
    borderRadius: 'lg',
  },
};

const Switch = {
  baseStyle: {
    track: {
      _focus: {
        boxShadow: 'none',
      },
    },
  },
  defaultProps: {
    colorScheme: 'teal',
  },
};

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
export const theme = extendTheme({
  components: {
    Checkbox,
    Input,
    Select,
    Button,
    Switch,
  },
  config: {
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    useSystemColorMode: colorMode ? false : true,
  },
  styles: {
    global: {
      body: {
        overflow: 'hidden',
        lineHeight: '18px',
        fontSize: '75%',
      },
    },
  },
  fonts: {
    body: 'sans-serif !important',
  },
});

interface ThemeProps {
  children: React.ReactNode;
}

export const Theme = ({
  children,
}: Readonly<ThemeProps>): React.ReactElement => (
  <ChakraProvider theme={theme}>{children}</ChakraProvider>
);
