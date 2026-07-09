import { useTranslation } from '@lace-contract/i18n';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing, useTheme } from '../../../../design-tokens';
import { Icon, Text } from '../../../atoms';
import { Sheet } from '../../../organisms';

import type { Theme } from '../../../../design-tokens/theme/types';

export interface DeregistrationSuccessProps {
  onGoToStakingCenter: () => void;
  testID?: string;
}

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    headerTitle: {
      color: theme.text.primary,
      textAlign: 'center',
    },
    contentContainer: {
      paddingBottom: spacing.XL,
    },
    content: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.XL,
    },
    icon: {
      marginBottom: spacing.L,
    },
    message: {
      textAlign: 'center',
      paddingHorizontal: spacing.M,
    },
  });

export const DeregistrationSuccess = ({
  testID = 'deregistration-success-sheet',
}: DeregistrationSuccessProps) => {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const { t } = useTranslation();

  return (
    <Sheet.Scroll
      testID={testID}
      contentContainerStyle={styles.contentContainer}>
      <View style={styles.content}>
        <Icon
          name="RelievedFace"
          variant="solid"
          size={60}
          style={styles.icon}
        />
        <Text.M style={styles.message}>
          {t('v2.generic.staking.deregistration-success.subtitle')}
        </Text.M>
      </View>
    </Sheet.Scroll>
  );
};
