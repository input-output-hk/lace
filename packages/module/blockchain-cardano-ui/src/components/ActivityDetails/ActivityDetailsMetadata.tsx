import { useTranslation } from '@lace-contract/i18n';
import { Accordion, Text } from '@lace-lib/ui-toolkit';
import React from 'react';

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
            <Text.M testID={`metadata-${item.key}-value`}>
              {displayMetadataValue(item.value)}
            </Text.M>
          }
        />
      ))}
    </Accordion.Root>
  );
};
