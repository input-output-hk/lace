import { ActivityType } from '@lace-contract/activities';
import { useTranslation } from '@lace-contract/i18n';
import { Column, spacing, Text, truncateText } from '@lace-lib/ui-toolkit';
import React from 'react';
import { StyleSheet } from 'react-native';

import { useAddressTag } from '../../utils/address-utils';

import { ActivityDetailItem } from './ActivityDetailItem';

import type { TxSummary } from '@lace-contract/cardano-context';

interface ActivityDetailsSummaryProps {
  txSummary?: TxSummary[];
  ownAddresses?: string[];
}

export const ActivityDetailsSummary = ({
  txSummary,
  ownAddresses = [],
}: ActivityDetailsSummaryProps) => {
  const { t } = useTranslation();
  const { renderAddressTag } = useAddressTag(ownAddresses);
  const testID = 'activity-details-summary';

  if (!txSummary || txSummary.length === 0) return null;

  const getDirectionLabel = (type: ActivityType) => {
    return type === ActivityType.Send
      ? t('v2.activity-details.sheet.to')
      : t('v2.activity-details.sheet.from');
  };

  const renderAddresses = (summary: TxSummary, testID?: string) => {
    const { addr } = summary;

    if (addr.length === 0) return null;

    return (
      <Column style={styles.addressesContainer}>
        {addr.length > 1 && (
          <Text.M style={styles.multipleAddressesLabel}>
            {t('v2.activity-details.sheet.multipleAddresses')}
          </Text.M>
        )}
        {addr.map((address, index) => (
          <Column key={`${address}-${index}`} style={styles.addressItem}>
            <Text.M
              style={styles.addressText}
              testID={`${testID}-address-${index}`}>
              {truncateText(address)}
            </Text.M>
            {renderAddressTag(address)}
          </Column>
        ))}
      </Column>
    );
  };

  return (
    <>
      {txSummary.map((summary, index) => (
        <Column key={index} gap={spacing.M}>
          <ActivityDetailItem
            label={getDirectionLabel(summary.type)}
            value={renderAddresses(summary, `${testID}-${index}`)}
            shouldShowDivider={index === txSummary.length - 1}
          />
        </Column>
      ))}
    </>
  );
};

const styles = StyleSheet.create({
  multipleAddressesLabel: {
    marginBottom: spacing.S,
  },
  addressesContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  addressItem: {
    marginBottom: spacing.S,
    alignItems: 'flex-end',
  },
  addressText: {
    textAlign: 'right',
    marginBottom: spacing.XS,
  },
});
