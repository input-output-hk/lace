import { useTranslation } from '@lace-contract/i18n';
import {
  Column,
  Icon,
  radius,
  spacing,
  Text,
  useTheme,
} from '@lace-lib/ui-toolkit';
import React, { useCallback, useMemo } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import type { StackRoutes, StackScreenProps } from '@lace-lib/navigation';
import type { Theme } from '@lace-lib/ui-toolkit';

export const IntroPrivacyPage = ({
  navigation,
}: StackScreenProps<StackRoutes.IntroPrivacy>) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => getStyles(theme), [theme]);

  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <View style={styles.content}>
      <TouchableOpacity
        onPress={handleClose}
        style={styles.closeButton}
        testID="identity-center-close-button">
        <Icon name="Cancel" />
      </TouchableOpacity>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        <Column style={styles.header}>
          <Text.XL align="center">{t('v2.identity.page.introPrivacy')}</Text.XL>
        </Column>
      </ScrollView>
    </View>
  );
};

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    content: {
      flex: 1,
    },
    header: {
      paddingHorizontal: spacing.M,
      paddingVertical: spacing.L,
    },
    closeButton: {
      position: 'absolute',
      top: spacing.M,
      right: spacing.M,
      zIndex: 1,
      padding: spacing.XS,
      borderRadius: radius.SS,
      backgroundColor: theme.background.secondary,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      paddingTop: spacing.XXL,
    },
  });
