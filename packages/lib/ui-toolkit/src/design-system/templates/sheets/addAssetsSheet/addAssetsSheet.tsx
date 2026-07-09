import React, { useCallback, useMemo } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { NftItemsList } from '../..';
import { spacing } from '../../../../design-tokens';
import { isShieldedFromMetadata } from '../../../../utils/sendSheetUtils';
import { Column, CustomTag, Icon, Row, Text } from '../../../atoms';
import { EmptyStateMessage, Tabs, TokenItem } from '../../../molecules';
import { GenericFlashList, Sheet } from '../../../organisms';
import { getAssetImageUrl } from '../../../util';

export type TokenUIData = {
  tokenId: string;
  metadata?: {
    isNft?: boolean;
    image?: string;
    blockchainSpecific?: unknown;
  };
  displayLongName: string;
  displayShortName: string;
  decimals: number;
  availableBalance: string;
  pendingBalanceText?: string;
  currency: string;
  rate?: string;
  conversion?: string;
  isPriceStale?: boolean;
  isSelected: boolean;
  isDisabled?: boolean;
};

export enum SelectedAssetView {
  Assets = 0,
  Nfts = 1,
}

const isNft = (token: TokenUIData) => token.metadata?.isNft;

type AddAssetsLabels = {
  headerTitle: string;
  selectedLabel: string;
  tokensLabel: string;
  nftsLabel: string;
  totalBalanceWarning?: string;
  emptyStateMessage?: string;
  cancelLabel: string;
  confirmLabel: string;
  restrictionMessages?: string[];
};

type AddAssetsActions = {
  onClose: () => void;
  onAssetsSelectionChanged: (asset: TokenUIData) => void;
  setSelectedAssetView: (id: SelectedAssetView) => void;
  onToggleNftSelection: (index: number) => void;
  onConfirm: () => void;
};

type AddAssetsValues = {
  availableTokens: TokenUIData[];
  selectedAssetView: SelectedAssetView;
  selectedTokens: TokenUIData[];
  selectedNfts?: Record<string, boolean>;
  isLoading?: boolean;
  loaderColor?: string;
  shouldShowNfts: boolean;
  numberOfColumns: number;
};

interface AddAssetsSheetProps {
  values: AddAssetsValues;
  actions: AddAssetsActions;
  labels: AddAssetsLabels;
}

export const AddAssetsTemplate = ({
  values,
  actions,
  labels,
}: AddAssetsSheetProps) => {
  const {
    onAssetsSelectionChanged,
    setSelectedAssetView,
    onToggleNftSelection,
  } = actions;
  const {
    selectedAssetView,
    selectedTokens,
    selectedNfts,
    shouldShowNfts,
    availableTokens,
    isLoading,
    loaderColor,
    numberOfColumns,
  } = values;
  const {
    headerTitle,
    selectedLabel,
    tokensLabel,
    nftsLabel,
    totalBalanceWarning,
    emptyStateMessage,
    restrictionMessages,
  } = labels;
  const styles = useMemo(() => getStyles(), []);
  const isToken = selectedAssetView === SelectedAssetView.Assets;
  const renderTokenItem = useCallback(
    ({ item, index }: { item: TokenUIData; index: number }) => {
      if (isLoading) {
        return null;
      }

      const isChecked = selectedTokens.some(
        token => token.tokenId === item.tokenId,
      );

      const handleShowRadioValueChange = () => {
        onAssetsSelectionChanged(item);
      };

      const isShielded = isShieldedFromMetadata(item.metadata);

      return (
        <View style={styles.tokenWrapper}>
          <TokenItem
            testID={`token-item-${index}`}
            logo={getAssetImageUrl(item.metadata?.image)}
            name={item.displayLongName}
            balance={item.availableBalance}
            balancePendingText={item.pendingBalanceText}
            currency={item.currency}
            rate={item.rate}
            conversion={item.conversion}
            isPriceStale={item.isPriceStale}
            onRadioValueChange={
              shouldShowNfts ? handleShowRadioValueChange : undefined
            }
            onPress={!shouldShowNfts ? handleShowRadioValueChange : undefined}
            isChecked={isChecked}
            shielded={isShielded}
            isLoading={isLoading}
            isDisabled={item.isDisabled}
          />
        </View>
      );
    },
    [onAssetsSelectionChanged, selectedTokens, shouldShowNfts, isLoading],
  );

  const keyExtractor = (item: TokenUIData) => item?.tokenId;

  const assetsCount =
    selectedTokens.length +
    (selectedNfts ? Object.values(selectedNfts).filter(Boolean).length : 0) +
    ' ';

  const EmptyStateComponent = useMemo(
    () => (
      <EmptyStateMessage
        message={emptyStateMessage ?? ''}
        style={styles.emptyStateContainer}
      />
    ),
    [emptyStateMessage],
  );

  return (
    <Sheet.Scroll
      showsVerticalScrollIndicator={false}
      scrollEnabled={availableTokens.length !== 0}>
      <Column style={styles.container}>
        <Row justifyContent="center">
          <Text.M variant="secondary" testID="add-assets-count">
            {assetsCount}
          </Text.M>
          <Text.M testID="add-assets-label">
            {headerTitle} {selectedLabel}
          </Text.M>
        </Row>
        {shouldShowNfts && (
          <Tabs
            tabs={[
              {
                label: tokensLabel,
                value: 0,
                testID: 'add-assets-tokens-tab',
              },
              { label: nftsLabel, value: 1, testID: 'add-assets-nfts-tab' },
            ]}
            value={isToken ? 0 : 1}
            onChange={value => {
              setSelectedAssetView(value as SelectedAssetView);
            }}
          />
        )}
        {restrictionMessages?.map((message, index) => (
          <CustomTag
            key={`restriction-${index}`}
            color="primary"
            backgroundType="semiTransparent"
            icon={<Icon name="InformationCircle" size={16} />}
            label={message}
            isAlignStart
          />
        ))}
        <Column style={styles.bottomGap}>
          {isToken ? (
            <Column gap={spacing.S}>
              {isLoading ? (
                <View style={styles.loaderContainer} testID="add-assets-loader">
                  <ActivityIndicator size="small" color={loaderColor} />
                </View>
              ) : (
                <GenericFlashList
                  contentContainerStyle={styles.tokensList}
                  data={availableTokens.filter(t => !isNft(t))}
                  renderItem={renderTokenItem}
                  keyExtractor={keyExtractor}
                  ListEmptyComponent={EmptyStateComponent}
                />
              )}
            </Column>
          ) : (
            <NftItemsList
              nfts={availableTokens.filter(isNft)}
              onToggleNftSelection={onToggleNftSelection}
              numberOfColumns={numberOfColumns}
              listEmptyComponent={EmptyStateComponent}
            />
          )}

          {!!totalBalanceWarning && (
            <CustomTag
              icon={<Icon name="InformationCircle" size={16} />}
              label={totalBalanceWarning}
            />
          )}
        </Column>
      </Column>
    </Sheet.Scroll>
  );
};

const getStyles = () =>
  StyleSheet.create({
    container: {
      gap: spacing.L,
      paddingBottom: spacing.M,
    },
    tokenWrapper: {
      marginBottom: spacing.S,
    },
    loaderContainer: {
      minHeight: 350,
      justifyContent: 'center',
    },
    bottomGap: {
      marginBottom: spacing.XXXL,
    },
    tokensList: {
      paddingBottom: spacing.L,
    },
    emptyStateContainer: {
      // Matches loaderContainer minHeight to prevent sheet height jumps
      height: 350,
    },
  });
