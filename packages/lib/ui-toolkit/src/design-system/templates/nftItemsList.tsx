import type { LayoutChangeEvent } from 'react-native';

import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { spacing } from '../../design-tokens';
import { Column } from '../atoms';
import { NFTItem } from '../molecules';
import { getAssetImageUrl, getWebIpfsFallbackUri } from '../util';

const NUM_COLUMNS = 3;

export interface NftItem {
  tokenId: string;
  isSelected: boolean;
  metadata?: { image?: string };
  displayLongName: string;
  uri?: string;
}

interface NftsProps {
  nfts: NftItem[];
  onToggleNftSelection: (index: number) => void;
  numberOfColumns?: number;
  keyExtractor?: (item: NftItem, index: number) => string;
  listEmptyComponent?: React.ReactNode;
}

export const NftItemsList = ({
  nfts,
  onToggleNftSelection,
  numberOfColumns,
  keyExtractor,
  listEmptyComponent,
}: NftsProps) => {
  const [listWidth, setListWidth] = useState(0);
  const columns = numberOfColumns ?? NUM_COLUMNS;

  const itemSize = useMemo(() => {
    if (listWidth === 0) return 0;
    return (listWidth - spacing.S * (columns - 1)) / columns;
  }, [listWidth, columns]);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    setListWidth(width);
  }, []);

  const renderNFTItem = useCallback(
    ({ item, index }: { item: NftItem; index: number }) => {
      const thumbnailImage = item.uri
        ? getWebIpfsFallbackUri(item.uri)
        : getAssetImageUrl(item.metadata?.image);

      return (
        <Column style={styles.nftItem}>
          <NFTItem
            image={{ uri: thumbnailImage }}
            fallback={item.displayLongName}
            label={item.displayLongName}
            size={itemSize}
            shape="squared"
            onRadioValueChange={() => {
              onToggleNftSelection(index);
            }}
            radioValue={item.isSelected ? item.displayLongName : ''}
            testID={`nft-item-${index}`}
            style={styles.nftItem}
          />
        </Column>
      );
    },
    [onToggleNftSelection, itemSize],
  );

  if (itemSize === 0) {
    return <View onLayout={handleLayout} style={styles.container} />;
  }

  return (
    <View onLayout={handleLayout} style={styles.container}>
      <FlatList
        key={`nft-list-${columns}`}
        keyExtractor={keyExtractor}
        data={nfts}
        renderItem={renderNFTItem}
        numColumns={columns}
        showsVerticalScrollIndicator={false}
        columnWrapperStyle={columns > 1 ? styles.columnWrapper : undefined}
        scrollEnabled={false}
        nestedScrollEnabled={false}
        ListEmptyComponent={(): React.ReactNode => listEmptyComponent || null}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  nftItem: {
    marginBottom: spacing.XS,
  },
  columnWrapper: {
    gap: spacing.S,
    marginBottom: spacing.S,
  },
});
