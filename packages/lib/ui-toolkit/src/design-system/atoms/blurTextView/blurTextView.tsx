import type { ReactNode } from 'react';

import { BlurView } from 'expo-blur';
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { useTheme, spacing } from '../../../design-tokens';
import { Text } from '../text/text';

export interface BlurTextViewProps {
  children: ReactNode;
  isBlurred: boolean;
  testID?: string;
}

const BLUR_CHAR = '•';
const BLUR_LENGTH = 6;

export const BlurTextView: React.FC<BlurTextViewProps> = ({
  children,
  isBlurred,
  testID,
}) => {
  const { theme } = useTheme();
  const styles = getStyles();

  // On Android, show masked characters when blurred instead of using native blur
  const getDisplayText = (): number | string => {
    if (Platform.OS === 'android' && isBlurred) {
      return BLUR_CHAR.repeat(BLUR_LENGTH);
    }

    if (typeof children === 'string' || typeof children === 'number') {
      return children;
    }

    if (Array.isArray(children)) {
      return children.join('');
    }

    return ' ';
  };

  return (
    <View style={styles.textWrapper} testID={testID}>
      <Text.S align="center">{getDisplayText()}</Text.S>
      {Platform.OS !== 'android' && isBlurred && (
        <BlurView
          intensity={15}
          tint={theme.name === 'dark' ? 'dark' : 'light'}
          style={styles.blurOverlay}
        />
      )}
    </View>
  );
};

const getStyles = () =>
  StyleSheet.create({
    textWrapper: {
      position: 'relative',
      paddingHorizontal: spacing.XS,
      paddingVertical: spacing.XS,
    },
    blurOverlay: {
      ...StyleSheet.absoluteFillObject,
    },
  });
