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
    buttonSection: {
      gap: spacing.XL,
    },
    actionButton: {
      justifyContent: 'flex-start',
      borderWidth: 1,
      borderColor: theme.border.top,
      paddingHorizontal: spacing.M,
      paddingVertical: spacing.XL,
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
    iconStyle: {
      size: 35,
    },
  };
};
