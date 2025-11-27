import React, { useEffect, useState } from 'react';

import { ChakraProvider, extendTheme } from '@chakra-ui/react';

import './app/components/styles.css';
import '@fontsource/ubuntu/latin.css';

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
  styles: {
    global: {
      body: {
        overflow: 'hidden',
        lineHeight: '1.5',
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
  initialTheme: 'dark' | 'light';
}

export const Theme = ({
  children,
  initialTheme,
}: Readonly<ThemeProps>): React.ReactElement => {
  const [colorMode, setColorMode] = useState(
    localStorage['chakra-ui-color-mode'] || initialTheme,
  );

  useEffect(() => {
    const handleStorageChange = () => {
      setColorMode(localStorage['chakra-ui-color-mode'] || initialTheme);
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [initialTheme]);

  const customTheme = extendTheme({
    ...theme,
    config: {
      initialColorMode: colorMode,
    },
  });

  return <ChakraProvider theme={customTheme}>{children}</ChakraProvider>;
};
