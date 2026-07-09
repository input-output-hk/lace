import React from 'react';
import { StyleSheet } from 'react-native';

import { spacing } from '../../../../design-tokens';
import { Column, Text, type BlockchainIconName } from '../../../atoms';
import { DAppCard, EmptyStateMessage } from '../../../molecules';
import { Sheet } from '../../../organisms';
import { footerHeight } from '../../../organisms/sheet/sheet';

interface AuthorizedDAppsSheetProps {
  subtitle?: string;
  emptyMessage?: string;
  dApps: Array<{
    id: string;
    name: string;
    category: string;
    icon: string;
    blockchain?: BlockchainIconName;
    onDAppRemove: () => void;
  }>;
  testID?: string;
}

export const AuthorizedDAppsSheet = ({
  subtitle,
  emptyMessage,
  dApps,
  testID = 'authorized-dapps-sheet',
}: AuthorizedDAppsSheetProps) => (
  <Sheet.Scroll testID={testID} contentContainerStyle={styles.contentContainer}>
    <Column
      gap={subtitle ? spacing.XXL : spacing.M}
      style={subtitle ? styles.sheetBodyWithSubtitle : undefined}>
      {subtitle ? (
        <Text.XS testID={`${testID}-subtitle`}>{subtitle}</Text.XS>
      ) : null}
      {dApps.length === 0 ? (
        <EmptyStateMessage
          message={emptyMessage ?? ''}
          style={styles.emptyState}
          testID={`${testID}-empty-state-message`}
        />
      ) : (
        <Column
          gap={spacing.M}
          style={subtitle ? undefined : styles.dAppsContainer}>
          {dApps.map(item => (
            <DAppCard
              key={item.id}
              name={item.name}
              description={item.category}
              avatarImage={item.icon}
              blockchain={item.blockchain}
              onDelete={item.onDAppRemove}
            />
          ))}
        </Column>
      )}
    </Column>
  </Sheet.Scroll>
);

const styles = StyleSheet.create({
  contentContainer: {
    paddingBottom: footerHeight.horizontal,
  },
  emptyState: {
    height: 350,
  },
  sheetBodyWithSubtitle: {
    paddingTop: spacing.L,
  },
  dAppsContainer: {
    marginTop: spacing.M,
  },
});
