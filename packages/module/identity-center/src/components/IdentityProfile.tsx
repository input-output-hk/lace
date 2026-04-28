import { useTranslation } from '@lace-contract/i18n';
import {
  Button,
  Column,
  Icon,
  Row,
  spacing,
  Text,
  useTheme,
} from '@lace-lib/ui-toolkit';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import type { Theme } from '@lace-lib/ui-toolkit';

interface IdentityProfileProps {
  name: string;
  did: string;
}

export const IdentityProfile = ({ name, did }: IdentityProfileProps) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => getStyles(theme), [theme]);

  return (
    <Column alignItems="center" style={styles.container}>
      {/* Mock QR Code Placeholder */}
      <View style={styles.qrContainer}>
        <Icon name="QrCode" size={80} color={theme.text.primary} />
      </View>

      <Text.XL style={styles.name}>{name}</Text.XL>
      <Text.S
        variant="secondary"
        style={styles.did}
        numberOfLines={1}
        ellipsizeMode="middle">
        {did}
      </Text.S>

      <Row gap={spacing.M} style={styles.actions}>
        <Button.Primary
          label={t('v2.identity.profile.showQrCode')}
          preIconName="View"
          onPress={() => {}}
        />
        <Button.Secondary
          label={t('v2.identity.profile.copy')}
          preIconName="Copy"
          onPress={() => {}}
        />
      </Row>
    </Column>
  );
};

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      paddingVertical: spacing.L,
      alignItems: 'center',
    },
    qrContainer: {
      width: 120,
      height: 120,
      backgroundColor: theme.background.secondary, // placeholder bg
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing.M,
    },
    name: {
      marginBottom: spacing.XS,
    },
    did: {
      marginBottom: spacing.L,
      textAlign: 'center',
      paddingHorizontal: spacing.L,
    },
    actions: {
      marginTop: spacing.S,
    },
  });
