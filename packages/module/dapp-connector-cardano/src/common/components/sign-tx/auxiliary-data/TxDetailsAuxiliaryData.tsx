import { useTranslation } from '@lace-contract/i18n';
import {
  Column,
  spacing,
  Text,
  useCopyToClipboard,
  useTheme,
} from '@lace-lib/ui-toolkit';
import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity } from 'react-native';

import { formatMetadataForDisplay } from '../../../utils';
import { CollapsibleSection } from '../CollapsibleSection';

import type { Cardano } from '@cardano-sdk/core';

/**
 * Props for the TxDetailsAuxiliaryData component.
 */
export interface TxDetailsAuxiliaryDataProps {
  /** The auxiliary data containing metadata blob */
  auxiliaryData: Cardano.AuxiliaryData;
  /** Test identifier prefix */
  testID?: string;
}

/**
 * Component that displays transaction auxiliary data (metadata) as formatted JSON.
 * Provides copy-to-clipboard functionality with visual feedback.
 *
 * Displays metadata within a collapsible section using monospace formatting
 * for readability. Handles various Cardano metadata types including blobs,
 * labels, and nested structures.
 *
 * @param props - Component props
 * @returns React element displaying the metadata, or null if no metadata exists
 */
export const TxDetailsAuxiliaryData = ({
  auxiliaryData,
  testID,
}: TxDetailsAuxiliaryDataProps): React.ReactElement | null => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  const [isCopied, setIsCopied] = useState(false);

  const { copyToClipboard } = useCopyToClipboard({
    onSuccess: () => {
      setIsCopied(true);
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    },
  });

  const formattedMetadata = useMemo(
    () => formatMetadataForDisplay(auxiliaryData),
    [auxiliaryData],
  );

  const handleCopy = useCallback(() => {
    if (formattedMetadata) {
      copyToClipboard(formattedMetadata);
    }
  }, [formattedMetadata, copyToClipboard]);

  if (!formattedMetadata) {
    return null;
  }

  return (
    <CollapsibleSection
      title={t('dapp-connector.cardano.sign-tx.auxiliary-data-label')}
      testID={testID}>
      <Column gap={spacing.L} testID={testID ? `${testID}-content` : undefined}>
        <Column style={styles.metadataContainer} gap={spacing.L}>
          <TouchableOpacity
            style={styles.copyButton}
            onPress={handleCopy}
            testID={testID ? `${testID}-copy-button` : undefined}
            accessibilityLabel={t(
              'dapp-connector.cardano.sign-tx.auxiliary-data.copy-button',
              { defaultValue: 'Copy' },
            )}>
            <Text.S style={styles.copyButtonText}>
              {isCopied
                ? t('dapp-connector.cardano.sign-tx.auxiliary-data.copied', {
                    defaultValue: 'Copied to clipboard',
                  })
                : t(
                    'dapp-connector.cardano.sign-tx.auxiliary-data.copy-button',
                    {
                      defaultValue: 'Copy',
                    },
                  )}
            </Text.S>
          </TouchableOpacity>

          <ScrollView
            style={styles.scrollView}
            nestedScrollEnabled
            testID={testID ? `${testID}-scroll-view` : undefined}>
            <Text.S
              style={styles.metadataText}
              testID={testID ? `${testID}-value` : undefined}>
              {formattedMetadata}
            </Text.S>
          </ScrollView>
        </Column>
      </Column>
    </CollapsibleSection>
  );
};

const getStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    metadataContainer: {
      position: 'relative',
    },
    copyButton: {
      position: 'absolute',
      top: spacing.XS,
      right: spacing.XS,
      zIndex: 1,
      paddingHorizontal: spacing.S,
      paddingVertical: spacing.XS,
      backgroundColor: theme.background.primary,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.border.middle,
    },
    copyButtonText: {
      color: theme.text.primary,
      fontWeight: '600',
    },
    scrollView: {
      maxHeight: 200,
      backgroundColor: theme.background.secondary,
      borderRadius: 16,
      padding: spacing.M,
    },
    metadataText: {
      fontFamily: 'monospace',
      color: theme.text.primary,
      lineHeight: 20,
    },
  });
