import { useTranslation } from '@lace-contract/i18n';
import {
  Avatar,
  Card,
  Column,
  Icon,
  Row,
  spacing,
  Text,
  useTheme,
} from '@lace-lib/ui-toolkit';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import type { Activity, Connection } from '../data/mockData';
import type { Theme } from '@lace-lib/ui-toolkit';

interface ActionListProps {
  data: (Activity | Connection)[];
  type: 'activity' | 'connection';
}

export const ActionList = ({ data, type }: ActionListProps) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => getStyles(theme), [theme]);

  const renderItem = ({ item }: { item: Activity | Connection }) => {
    if (type === 'connection') {
      const connection = item as Connection;
      return (
        <Card cardStyle={styles.card}>
          <Row alignItems="center" justifyContent="space-between">
            <Row alignItems="center" gap={spacing.S}>
              <Avatar size={40} content={{ fallback: connection.name[0] }} />
              <Column>
                <Text.M style={styles.boldText}>{connection.name}</Text.M>
                <Text.XS variant="secondary">
                  {t('v2.identity.connection.discordServer')}
                </Text.XS>
              </Column>
            </Row>

            <Row alignItems="center" gap={spacing.XS}>
              {connection.humanityProof && (
                <Row alignItems="center" gap={2} style={styles.badge}>
                  <Icon name="Tick" size={12} color={theme.data.positive} />
                  <Text.XS style={styles.badgeText}>
                    {t('v2.identity.connection.humanityProof')}
                  </Text.XS>
                </Row>
              )}
              <Icon name="Settings" size={20} />
            </Row>
          </Row>
        </Card>
      );
    } else {
      const activity = item as Activity;
      return (
        <Card cardStyle={styles.card}>
          <Row alignItems="center" justifyContent="space-between">
            <Column>
              <Text.M style={styles.boldText}>{activity.title}</Text.M>
              <Text.XS variant="secondary">{activity.date}</Text.XS>
            </Column>
            <Text.S style={styles.statusPositive}>{activity.status}</Text.S>
          </Row>
        </Card>
      );
    }
  };

  return (
    <View style={styles.container}>
      {data.map(item => (
        <View key={item.id} style={styles.itemWrapper}>
          {renderItem({ item })}
        </View>
      ))}
    </View>
  );
};

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      paddingVertical: spacing.M,
    },
    itemWrapper: {
      marginBottom: spacing.S,
    },
    card: {
      padding: spacing.M,
      borderRadius: spacing.M,
    },
    boldText: {
      fontWeight: 'bold',
    },
    statusPositive: {
      color: theme.data.positive,
    },
    badgeText: {
      fontSize: 10,
    },
    badge: {
      backgroundColor: theme.background.secondary,
      paddingHorizontal: spacing.XS,
      paddingVertical: 2,
      borderRadius: 10,
    },
  });
