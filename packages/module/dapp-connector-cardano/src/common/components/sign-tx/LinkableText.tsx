import { Text, useTheme } from '@lace-lib/ui-toolkit';
import React, { useCallback, useMemo } from 'react';
import { Linking, StyleSheet, TouchableOpacity } from 'react-native';

interface LinkableTextProps {
  url: string;
  displayText: string;
  numberOfLines?: number;
  variant?: 'S' | 'XXS';
  testID?: string;
}

/**
 * Renders text that opens the provided URL on tap.
 */
export const LinkableText = ({
  url,
  displayText,
  numberOfLines,
  variant = 'S',
  testID,
}: LinkableTextProps) => {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  const handlePress = useCallback(() => {
    Linking.openURL(url).catch((error: unknown) => {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.warn('[LinkableText] Failed to open URL:', url, error);
      }
    });
  }, [url]);

  const text =
    variant === 'XXS' ? (
      <Text.XS style={styles.link} numberOfLines={numberOfLines}>
        {displayText}
      </Text.XS>
    ) : (
      <Text.S style={styles.link} numberOfLines={numberOfLines}>
        {displayText}
      </Text.S>
    );

  return (
    <TouchableOpacity onPress={handlePress} testID={testID}>
      {text}
    </TouchableOpacity>
  );
};

const getStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    link: {
      color: theme.brand.ascendingSecondary,
      textAlign: 'right',
    },
  });
