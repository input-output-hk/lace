import { useTranslation } from '@lace-contract/i18n';
import React, { useCallback, useMemo } from 'react';
import { StyleSheet } from 'react-native';

import { spacing } from '../../../../design-tokens';
import { Column, CustomTag, Icon, Row, Text } from '../../../atoms';
import {
  RadioGroup,
  SheetFooter,
  SheetHeader,
  useFooterHeight,
} from '../../../molecules';
import { Sheet } from '../../../organisms';

const TESTNET = 'testnet';
export interface TestnetNetwork {
  value: string;
  label: string;
}

export interface BlockchainTestnetGroup {
  blockchainName: string;
  networks: TestnetNetwork[];
}

interface NetworkSelectionSheetProps {
  title: string;
  description: string;
  networkTypeOptions: Array<{ label: string; value: string }>;
  networkTypeValue: string;
  onNetworkTypeChange: (value: string) => void;
  blockchainTestnetGroups: BlockchainTestnetGroup[];
  selectedTestnetsByBlockchain: Record<string, string>;
  onTestnetChange: (blockchainName: string, value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  cancelLabel: string;
  confirmLabel: string;
  testID?: string;
}

export const NetworkSelectionSheet = ({
  title,
  description,
  networkTypeOptions,
  networkTypeValue,
  onNetworkTypeChange,
  blockchainTestnetGroups,
  selectedTestnetsByBlockchain,
  onTestnetChange,
  onClose,
  onConfirm,
  cancelLabel,
  confirmLabel,
  testID = 'network-selection-sheet',
}: NetworkSelectionSheetProps) => {
  const { t } = useTranslation();
  const footerHeight = useFooterHeight();
  const scrollContainerStyle = useMemo(
    () => ({ paddingBottom: footerHeight }),
    [footerHeight],
  );
  const hasTestnets = blockchainTestnetGroups.length > 0;
  const isTestnetSelected = networkTypeValue === TESTNET;

  // Only show testnet option if there are testnets available
  const filteredNetworkTypeOptions = hasTestnets
    ? networkTypeOptions
    : networkTypeOptions.filter(option => option.value !== TESTNET);

  const renderBlockchainTestnetGroup = useCallback(
    (group: BlockchainTestnetGroup, index: number) => {
      const selectedValue =
        selectedTestnetsByBlockchain[group.blockchainName] || '';
      const optionsCount = group.networks.length;
      const blockchainInfoLabelOptions = {
        blockchainName: group.blockchainName,
        count: optionsCount,
      };
      const label = t(
        'v2.sheets.network-selection.blockchain-info',
        '',
        blockchainInfoLabelOptions,
      );

      return (
        <Column
          key={group.blockchainName}
          gap={spacing.M}
          testID={`${testID}-blockchain-group-${index}`}>
          <Row>
            <CustomTag
              icon={<Icon name="InformationCircle" size={20} />}
              label={label}
              size="M"
              color="neutral"
              backgroundType="transparent"
              isAlignStart
            />
          </Row>

          <RadioGroup
            options={group.networks.map(network => ({
              value: network.value,
              label: network.label,
            }))}
            value={selectedValue}
            onChange={value => {
              onTestnetChange(group.blockchainName, value);
            }}
            direction="column"
            testID={`${testID}-radio-group-${group.blockchainName}`}
          />
        </Column>
      );
    },
    [selectedTestnetsByBlockchain, onTestnetChange, testID, t],
  );

  return (
    <>
      <SheetHeader title={title} testID={`${testID}-header`} />
      <Sheet.Scroll
        testID={testID}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={scrollContainerStyle}>
        <Text.S testID={`${testID}-description`}>{description}</Text.S>

        <RadioGroup
          options={filteredNetworkTypeOptions}
          value={networkTypeValue}
          onChange={onNetworkTypeChange}
          direction="column"
          style={styles.networkTypeGroup}
          testID={`${testID}-network-type-radio-group`}
        />

        {isTestnetSelected && hasTestnets && (
          <Column gap={spacing.L} style={styles.blockchainGroupsContainer}>
            {blockchainTestnetGroups.map(renderBlockchainTestnetGroup)}
          </Column>
        )}
      </Sheet.Scroll>
      <SheetFooter
        secondaryButton={{
          label: cancelLabel,
          onPress: onClose,
          testID: `${testID}-cancel-button`,
        }}
        primaryButton={{
          label: confirmLabel,
          onPress: onConfirm,
          testID: `${testID}-confirm-button`,
        }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  networkTypeGroup: {
    marginTop: spacing.L,
    gap: spacing.M,
  },
  blockchainGroupsContainer: {
    marginTop: spacing.L,
  },
});
