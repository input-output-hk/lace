import type { ReactNode } from 'react';

import * as React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { radius, spacing } from '../../../design-tokens';
import { ActionButton, Brand, Box, Text } from '../../atoms';
import { getIsWideLayout } from '../../util/commons';

import { OnboardingLayout } from './OnboardingLayout';

import type { Theme } from '../../../design-tokens';
import type { IconName } from '../../atoms';

export interface OnboardingStartActionItem {
  icon: IconName;
  title: string;
  description: string;
  onPress: () => void;
  testID: string;
}

interface OnboardingStartProps {
  actions: OnboardingStartActionItem[];
  legalText: ReactNode;
  theme: Theme;
  resetSignal?: number;
  walletOptionsDropdown?: ReactNode;
}

export const OnboardingStart = (props: OnboardingStartProps) => {
  const { actions, legalText, theme, walletOptionsDropdown } = props;
  const { width } = useWindowDimensions();
  const isWideLayout = getIsWideLayout(width);
  const styles = createStyles(theme, isWideLayout);

  return (
    <OnboardingLayout>
      <Box style={styles.container}>
        <View style={styles.brandSection}>
          <View style={styles.brandLogo}>
            <Brand height={58} />
          </View>
          {walletOptionsDropdown && (
            <View style={styles.dropdownWrapper}>{walletOptionsDropdown}</View>
          )}
        </View>

        <View style={styles.buttonSection}>
          {actions.map(action => (
            <ActionButton
              key={action.testID}
              icon={action.icon}
              title={action.title}
              description={action.description}
              onPress={action.onPress}
              containerStyle={styles.actionButton}
              testID={action.testID}
              iconStyle={styles.iconStyle}
            />
          ))}
        </View>

        <View style={styles.footerSection}>
          <Text.M align="center" style={styles.legalText} testID="legal-text">
            {legalText}
          </Text.M>
        </View>
      </Box>
    </OnboardingLayout>
  );
};

const createStyles = (theme: Theme, isWideLayout: boolean) => {
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: spacing.L,
      justifyContent: 'space-between',
    },
    brandSection: {
      alignItems: 'center',
      paddingTop: spacing.L,
    },
    dropdownWrapper: {
      position: 'absolute',
      right: 0,
      top: spacing.L,
      minWidth: 160,
    },
    brandLogo: {
      marginTop: isWideLayout ? 0 : spacing.XL + spacing.L,
    },
    // Tighter than the sections around it: the cards are one set of choices, so
    // they need to read as a group rather than as unrelated blocks separated by
    // as much space as the sections themselves. Composed rather than a literal
    // 12 because the scale has no token between S and M.
    buttonSection: {
      gap: spacing.S + spacing.XS,
    },
    actionButton: {
      justifyContent: 'flex-start',
      borderWidth: 1,
      borderColor: theme.border.top,
      paddingHorizontal: spacing.M,
      gap: spacing.M,
      paddingVertical: spacing.L,
      width: '100%',
      borderRadius: radius.M,
    },
    footerSection: {
      paddingVertical: spacing.L,
    },
    legalText: {
      height: 120,
    },
  });

  return {
    ...styles,
    // Sized to sit with the card's title rather than dominate it: at 35 the
    // glyph was taller than both lines of text it labels.
    iconStyle: {
      size: 24,
    },
  };
};
