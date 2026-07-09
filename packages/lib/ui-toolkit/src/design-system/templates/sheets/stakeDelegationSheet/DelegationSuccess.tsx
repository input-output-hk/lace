import { useTranslation } from '@lace-contract/i18n';
import React from 'react';
import { StyleSheet } from 'react-native';

import { spacing, useTheme } from '../../../../design-tokens';
import { Text, Icon, Column } from '../../../atoms';
import { footerHeight } from '../../../organisms';

import type { Theme } from '../../../../design-tokens/theme/types';

export interface DelegationSuccessProps {
  onGoToStakingCenter: () => void;
  testID?: string;
}

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    headerTitle: {
      color: theme.text.primary,
      textAlign: 'center',
    },
    content: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.XL,
      paddingBottom: footerHeight.horizontal,
    },
    icon: {
      marginBottom: spacing.L,
    },
    message: {
      textAlign: 'center',
      paddingHorizontal: spacing.M,
    },
  });

export const DelegationSuccess = ({
  testID = 'delegation-success-sheet',
}: DelegationSuccessProps) => {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const { t } = useTranslation();

  return (
    <Column style={styles.content} testID={testID}>
      <Icon name="RelievedFace" variant="solid" size={60} style={styles.icon} />
      <Text.M style={styles.message}>
        {t('v2.generic.staking.delegation-success.subtitle')}
      </Text.M>
    </Column>
  );
};
