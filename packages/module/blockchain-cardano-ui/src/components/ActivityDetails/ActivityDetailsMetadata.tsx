import { useTranslation } from '@lace-contract/i18n';
import { Accordion, Text } from '@lace-lib/ui-toolkit';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { displayMetadataValue } from '../../utils/metadata-mappers';

import { ActivityDetailItem } from './ActivityDetailItem';

import type { TxMetadata } from '@lace-contract/cardano-context';

export const ActivityDetailsMetadata = ({
  metadata,
}: {
  metadata: TxMetadata[];
}) => {
  const { t } = useTranslation();

  if (!metadata || metadata.length === 0) {
    return null;
  }

  return (
    <Accordion.Root
      title={t('v2.activity-details.sheet.activityDetails.metadata')}>
      {metadata?.map(item => (
        <ActivityDetailItem
          testID={`metadata-${item.key}`}
          key={item.key}
          label={item.key}
          value={
            <View style={styles.valueContainer}>
              <Text.M
                testID={`metadata-${item.key}-value`}
                style={styles.value}>
                {displayMetadataValue(item.value)}
              </Text.M>
            </View>
          }
        />
      ))}
    </Accordion.Root>
  );
};

const styles = StyleSheet.create({
  // `minWidth: 0` lets this flex child shrink below the intrinsic width of long
  // unbroken metadata strings (addresses, embedded JSON) so they wrap instead
  // of overflowing the drawer. Mirrors the dapp-connector InfoRow pattern.
  valueContainer: {
    flex: 1,
    flexBasis: 0,
    flexShrink: 1,
    minWidth: 0,
  },
  value: {
    width: '100%',
    textAlign: 'right',
  },
});
