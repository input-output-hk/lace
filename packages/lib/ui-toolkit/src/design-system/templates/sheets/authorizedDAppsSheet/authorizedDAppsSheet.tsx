import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';

import { spacing } from '../../../../design-tokens';
import { Column, Text, type BlockchainIconName } from '../../../atoms';
import {
  DAppCard,
  EmptyStateMessage,
  SheetFooter,
  SheetHeader,
  useFooterHeight,
} from '../../../molecules';
import { Sheet } from '../../../organisms';

interface AuthorizedDAppsSheetProps {
  title: string;
  subtitle?: string;
  emptyMessage?: string;
  dApps: Array<{
    id: string;
    name: string;
    category: string;
    icon: string;
    blockchain?: BlockchainIconName; // TODO: This should come from the DApp provider
    onDAppRemove: () => void;
  }>;
  browseButtonLabel: string;
  onBrowseDApps: () => void;
  closeButtonLabel: string;
  onClose: () => void;
  /** When false, shows a secondary close button instead of the primary browse action. */
  showBrowseButton?: boolean;
  testID?: string;
  browseButtonTestID?: string;
  closeButtonTestID?: string;
}

const getStyles = (footerHeight: number) =>
  StyleSheet.create({
    contentContainer: {
      paddingBottom: footerHeight,
    },
    emptyContentContainer: {
      flexGrow: 1,
      paddingBottom: footerHeight,
    },
    emptyState: {
      flex: 1,
      paddingVertical: spacing.XL,
      paddingHorizontal: spacing.M,
    },
    sheetBodyWithSubtitle: {
      paddingTop: spacing.L,
    },
    dAppsList: {
      marginTop: spacing.M,
    },
  });

export const AuthorizedDAppsSheet = ({
  title,
  subtitle,
  emptyMessage,
  dApps,
  browseButtonLabel,
  onBrowseDApps,
  closeButtonLabel,
  onClose,
  showBrowseButton = true,
  testID = 'authorized-dapps-sheet',
  browseButtonTestID = 'authorized-dapps-sheet-browse-button',
  closeButtonTestID = 'authorized-dapps-sheet-close-button',
}: AuthorizedDAppsSheetProps) => {
  const footerHeight = useFooterHeight();
  const styles = useMemo(() => getStyles(footerHeight), [footerHeight]);
  const isEmpty = dApps.length === 0;

  return (
    <>
      <SheetHeader title={title} />
      <Sheet.Scroll
        testID={testID}
        contentContainerStyle={
          isEmpty ? styles.emptyContentContainer : styles.contentContainer
        }>
        {isEmpty && emptyMessage ? (
          <EmptyStateMessage
            message={emptyMessage}
            style={styles.emptyState}
            testID={`${testID}-empty-state-message`}
          />
        ) : (
          <Column
            gap={subtitle ? spacing.XXL : 0}
            style={subtitle ? styles.sheetBodyWithSubtitle : undefined}>
            {subtitle ? (
              <Text.XS testID={`${testID}-subtitle`}>{subtitle}</Text.XS>
            ) : null}
            <Column
              gap={spacing.M}
              style={subtitle ? undefined : styles.dAppsList}>
              {dApps.map(dApp => (
                <DAppCard
                  key={dApp.id}
                  name={dApp.name}
                  description={dApp.category}
                  avatarImage={dApp.icon}
                  blockchain={dApp.blockchain}
                  onDelete={dApp.onDAppRemove}
                />
              ))}
            </Column>
          </Column>
        )}
      </Sheet.Scroll>

      <SheetFooter
        primaryButton={
          showBrowseButton
            ? {
                label: browseButtonLabel,
                onPress: onBrowseDApps,
                testID: browseButtonTestID,
              }
            : undefined
        }
        secondaryButton={
          showBrowseButton
            ? undefined
            : {
                label: closeButtonLabel,
                onPress: onClose,
                testID: closeButtonTestID,
              }
        }
      />
    </>
  );
};
