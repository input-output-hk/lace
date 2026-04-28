import { useTranslation } from '@lace-contract/i18n';
import { Card, Icon, Text, useTheme, spacing, Row } from '@lace-lib/ui-toolkit';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import type { Credential } from '../data/mockData';

export interface CredentialCardProps {
  credential: Credential;
}

export const CredentialCard = ({ credential }: CredentialCardProps) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => getStyles(), []);

  const iconName = useMemo(() => {
    switch (credential.type) {
      case 'humanity':
        return 'User';
      case 'age':
        return 'Calendar03';
      case 'biometrics':
        return 'FingerPrint';
      case 'passport':
        return 'PassportValid';
      case 'in-person':
        return 'Contacts';
      default:
        return 'File';
    }
  }, [credential.type]);

  const statusIcon = credential.status === 'valid' ? 'Tick' : 'AlertTriangle';
  const statusColor =
    credential.status === 'valid' ? theme.data.positive : theme.data.negative;

  return (
    <Card cardStyle={styles.card}>
      <Row justifyContent="space-between" alignItems="flex-start">
        <Icon name={iconName} size={24} color={theme.text.primary} />
        <Icon name={statusIcon} size={20} color={statusColor} />
      </Row>

      <View style={styles.content}>
        <Text.M style={styles.boldText}>{credential.title}</Text.M>
        <Text.XS variant="secondary">{credential.subtitle}</Text.XS>
        {credential.expirationDate && (
          <Text.XS variant="secondary" style={styles.expiration}>
            {t('v2.identity.credentials.expiresOn', {
              date: credential.expirationDate,
            })}
          </Text.XS>
        )}
      </View>
    </Card>
  );
};

const getStyles = () =>
  StyleSheet.create({
    card: {
      width: '48%', // Approx 2 columns
      height: 140, // Fixed height for grid
      marginBottom: spacing.M,
      justifyContent: 'space-between',
    },
    content: {
      gap: spacing.XS,
    },
    boldText: {
      fontWeight: 'bold',
    },
    expiration: {
      marginTop: spacing.XS,
    },
  });
