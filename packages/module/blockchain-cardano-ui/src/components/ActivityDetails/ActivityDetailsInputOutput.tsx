import { convertLovelacesToAda } from '@lace-contract/cardano-context';
import { useTranslation } from '@lace-contract/i18n';
import {
  Accordion,
  Column,
  Row,
  spacing,
  Text,
  truncateText,
} from '@lace-lib/ui-toolkit';
import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { useAddressTag } from '../../utils/address-utils';

import { ActivityDetailItem } from './ActivityDetailItem';

import type {
  CoinItemProps,
  TxOutputInput,
} from '@lace-contract/cardano-context';

export const ActivityDetailsInputOutput = ({
  inputOutput,
  label = 'Outputs',
  coinSymbol = 'ADA',
  ownAddresses = [],
}: {
  inputOutput?: TxOutputInput[];
  label?: 'Inputs' | 'Outputs';
  coinSymbol?: string;
  ownAddresses?: string[];
}) => {
  const { t } = useTranslation();
  const { renderAddressTag } = useAddressTag(ownAddresses);

  if (!inputOutput || inputOutput.length === 0) return null;

  return (
    <Accordion.Root title={label}>
      {inputOutput.map((input, index) => (
        <Accordion.AccordionContent key={index}>
          <Column gap={spacing.M}>
            <ActivityDetailItem
              label={t('v2.activity-details.sheet.address')}
              value={
                <Column gap={spacing.S} alignItems="flex-end">
                  <Text.M>{truncateText(input.addr)}</Text.M>
                  {renderAddressTag(input.addr)}
                </Column>
              }
            />
            <ActivityDetailItem
              shouldShowDivider={index !== inputOutput.length - 1}
              label={t('v2.activity-details.sheet.amount')}
              value={
                <Column
                  alignItems="flex-end"
                  gap={spacing.XS}
                  style={styles.amountColumn}>
                  <Text.M>
                    {convertLovelacesToAda(input.amount)}
                    {` ${coinSymbol}`}
                  </Text.M>
                  {input.assetList?.map((asset, assetIndex) => (
                    <AssetRow
                      key={`${asset.name}-${assetIndex}`}
                      asset={asset}
                      testID={`activity-details-asset-${asset.name}`}
                    />
                  ))}
                </Column>
              }
            />
          </Column>
        </Accordion.AccordionContent>
      ))}
    </Accordion.Root>
  );
};

const ASSET_NAME_MAX_LENGTH = 20;

const AssetRow = ({
  asset,
  testID,
}: {
  asset: CoinItemProps;
  testID?: string;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const toggleExpanded = useCallback(() => {
    setIsExpanded(value => !value);
  }, []);

  const displayedName = isExpanded
    ? asset.name
    : truncateText(asset.name, ASSET_NAME_MAX_LENGTH);

  return (
    <Pressable testID={testID} onPress={toggleExpanded} style={styles.assetRow}>
      <Row gap={spacing.XS} alignItems="flex-start">
        <Text.M style={styles.assetAmount}>{asset.amount}</Text.M>
        <Text.M variant="secondary" style={styles.assetName}>
          {displayedName}
        </Text.M>
      </Row>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  amountColumn: {
    flex: 1,
  },
  assetRow: {
    alignSelf: 'flex-end',
    paddingVertical: spacing.S,
  },
  assetAmount: {
    flexShrink: 0,
  },
  assetName: {
    flexShrink: 1,
    minWidth: 0,
    textAlign: 'right',
  },
});
