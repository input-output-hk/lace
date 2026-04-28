import { useTranslation } from '@lace-contract/i18n';
import { formatAmountToLocale } from '@lace-lib/util-render';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing } from '../../../../design-tokens';
import { Divider, Column, Row, Text } from '../../../atoms';
import { ProgressBar, DropdownMenu } from '../../../molecules';

const ADA_DECIMALS = 6;
const ADA_MAX_FRACTION_DIGITS = 2;

type EpochsRewardsProps = {
  epochs: Array<{ epoch: string; progress: number }>;
  epochsScale?: number[];
  filterOptions?: number[];
  selectedFilter?: number;
  onFilterChange: (index: number) => void;
};

export const EpochsRewards: React.FC<EpochsRewardsProps> = ({
  epochs,
  epochsScale = [],
  filterOptions = [],
  selectedFilter = 0,
  onFilterChange,
}) => {
  const { t } = useTranslation();

  const dropdownItems = useMemo(
    () =>
      filterOptions.length > 0
        ? filterOptions.map(n => t('v2.regular-pool.last-epochs', { n }))
        : [],
    [filterOptions, t],
  );

  const scaleLabels = useMemo(
    () =>
      epochsScale.map(value => {
        const formatted = formatAmountToLocale(
          value.toString(),
          ADA_DECIMALS,
          ADA_MAX_FRACTION_DIGITS,
        );

        return `${formatted} ADA`;
      }),
    [epochsScale],
  );

  return (
    <>
      <Column gap={spacing.M} style={styles.epochsSection}>
        <Row
          justifyContent="space-between"
          alignItems="center"
          style={styles.epochsHeader}>
          <Text.M variant="primary">
            {t('v2.regular-pool.epochs-rewards')}
          </Text.M>
          {filterOptions.length > 0 && (
            <View style={styles.dropdownWrapper}>
              <DropdownMenu
                items={dropdownItems}
                title={dropdownItems[selectedFilter]}
                selectedItemId={dropdownItems[selectedFilter]}
                onSelectItem={onFilterChange}
              />
            </View>
          )}
        </Row>

        <Column gap={spacing.S} style={styles.epochsList}>
          {epochs.map((epoch, index) => (
            <ProgressBar
              key={index}
              progress={epoch.progress}
              color="primary"
              placeholder={epoch.epoch}
            />
          ))}
        </Column>
        {epochsScale.length === 5 && (
          <Row
            justifyContent="space-between"
            alignItems="center"
            style={styles.scaleRow}>
            {scaleLabels.map((label, index) => (
              <Text.XS key={`${label}-${index}`} variant="secondary">
                {label}
              </Text.XS>
            ))}
          </Row>
        )}
      </Column>

      <View style={styles.dividerContainer}>
        <Divider />
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  epochsSection: {
    width: '100%',
    marginVertical: spacing.M,
  },
  epochsHeader: {
    width: '100%',
  },
  dropdownWrapper: {
    width: 170,
  },
  epochsList: {
    width: '100%',
  },
  scaleRow: {
    width: '100%',
    marginTop: spacing.XS,
    paddingLeft: '10%',
  },
  dividerContainer: {
    marginTop: spacing.M,
    width: '100%',
  },
});
