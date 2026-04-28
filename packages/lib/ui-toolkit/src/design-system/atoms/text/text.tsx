import type { TextProps as RNTextProps, TextStyle } from 'react-native';

import React, { useMemo } from 'react';
import { Text as RNText, StyleSheet } from 'react-native';

import { useTheme } from '../../../design-tokens';

type TextProps = RNTextProps & {
  size: 'header' | 'l' | 'm' | 'page-header' | 's' | 'xl' | 'xs';
  align?: TextStyle['textAlign'];
  variant?: 'primary' | 'secondary' | 'tertiary';
  weight?: TextStyle['fontWeight'];
  children?: React.ReactNode;
};

const Base = ({
  size,
  children,
  align = 'left',
  variant = 'primary',
  weight,
  style: textStyle,
  ...restProps
}: TextProps) => {
  const { theme } = useTheme();

  const memoizedStyles = useMemo(() => {
    return [
      textStyles[size],
      { textAlign: align, color: theme.text[variant] },
      weight ? { fontWeight: weight } : undefined,
      textStyle,
    ].filter(Boolean);
  }, [align, size, theme, textStyle, variant, weight]);

  return (
    <RNText style={memoizedStyles} {...restProps}>
      {children}
    </RNText>
  );
};

type PreSizedTextProps = Omit<TextProps, 'size'>;

const XS = (props: PreSizedTextProps) => <Base size={'xs'} {...props} />;
const S = (props: PreSizedTextProps) => <Base size={'s'} {...props} />;
const M = (props: PreSizedTextProps) => <Base size={'m'} {...props} />;
const L = (props: PreSizedTextProps) => <Base size={'l'} {...props} />;
const XL = (props: PreSizedTextProps) => <Base size={'xl'} {...props} />;
const Header = (props: PreSizedTextProps) => (
  <Base size={'header'} {...props} />
);
const PageHeader = (props: PreSizedTextProps) => (
  <Base size={'page-header'} {...props} />
);

export const Text = {
  XS,
  S,
  M,
  L,
  XL,
  Header,
  PageHeader,
};

const textStyles = StyleSheet.create({
  xs: {
    fontSize: 13,
    fontWeight: 500,
    fontFamily: 'ProximaNova-Medium',
  },
  s: {
    fontSize: 14,
    fontWeight: 500,
    fontFamily: 'ProximaNova-Medium',
  },
  m: {
    fontSize: 16,
    fontWeight: 500,
    fontFamily: 'ProximaNova-Medium',
  },
  l: {
    fontSize: 24,
    fontWeight: 500,
    fontFamily: 'BrandonGrotesque-Medium',
  },
  xl: {
    fontSize: 32,
    fontWeight: 500,
    fontFamily: 'BrandonGrotesque-Medium',
  },
  header: {
    fontSize: 46,
    fontWeight: 500,
    fontFamily: 'BrandonGrotesque-Medium',
  },
  'page-header': {
    fontSize: 52,
    fontWeight: 500,
    fontFamily: 'BrandonGrotesque-Medium',
  },
});
