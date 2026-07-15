import { useTranslation } from '@lace-contract/i18n';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing, useTheme } from '../../../../design-tokens';
import { Icon, Text } from '../../../atoms';
import { footerHeight, Sheet } from '../../../organisms';

import type { Theme } from '../../../../design-tokens';

export interface DRepDelegationSuccessProps {
  onGoToGovernanceCenter: () => void;
  testID?: string;
}

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    headerTitle: {
      color: theme.text.primary,
      textAlign: 'center',
    },
    contentContainer: {
      paddingBottom: footerHeight.horizontal,
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

export const DRepDelegationSuccess = ({
  onGoToGovernanceCenter,
  testID = 'drep-delegation-success-sheet',
}: DRepDelegationSuccessProps) => {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const { t } = useTranslation();

  return (
    <>
      <Sheet.Header title={t('v2.governance.delegation-success.title')} />
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
            {t('v2.governance.delegation-success.subtitle')}
          </Text.M>
        </View>
      </Sheet.Scroll>
      <Sheet.Footer
        primaryButton={{
          label: t('v2.governance.delegation-success.button'),
          onPress: onGoToGovernanceCenter,
          testID: `${testID}-go-to-governance-center-button`,
        }}
      />
    </>
  );
};
