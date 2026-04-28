import { useTranslation } from '@lace-contract/i18n';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing, useTheme } from '../../../../design-tokens';
import { Icon, Text } from '../../../atoms';
import { SheetFooter, SheetHeader, useFooterHeight } from '../../../molecules';
import { Sheet } from '../../../organisms';

import type { Theme } from '../../../../design-tokens/theme/types';

export interface DeregistrationSuccessProps {
  onGoToStakingCenter: () => void;
  testID?: string;
}

const getStyles = (theme: Theme, footerHeight: number) =>
  StyleSheet.create({
    headerTitle: {
      color: theme.text.primary,
      textAlign: 'center',
    },
    contentContainer: {
      paddingBottom: footerHeight,
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
  onGoToStakingCenter,
  testID = 'deregistration-success-sheet',
}: DeregistrationSuccessProps) => {
  const { theme } = useTheme();
  const footerHeight = useFooterHeight();
  const styles = useMemo(
    () => getStyles(theme, footerHeight),
    [theme, footerHeight],
  );
  const { t } = useTranslation();

  return (
    <>
      <SheetHeader
        title={t('v2.generic.staking.deregistration-success.title')}
      />
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
      <SheetFooter
        primaryButton={{
          label: t('v2.generic.staking.deregistration-success.button'),
          onPress: onGoToStakingCenter,
          testID: `${testID}-go-to-staking-center-button`,
        }}
      />
    </>
  );
};
