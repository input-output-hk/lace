import type {
  FlatList as FlatListRef,
  LayoutChangeEvent,
  ListRenderItemInfo,
  StyleProp,
  ViewStyle,
} from 'react-native';

import { NavigationControls, SheetRoutes } from '@lace-lib/navigation';
import {
  NFTItem,
  useTheme,
  getAssetImageUrl,
  spacing,
  IconButton,
  Icon,
  radius,
  isWeb,
} from '@lace-lib/ui-toolkit';
import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useLaceSelector } from '../../../hooks';
import { getListHeaderNode } from '../utils/getListHeaderNode';

import type { ListHeaderComponentProperty } from '../types';
import type { FolderId } from '@lace-contract/tokens';
import type { Theme } from '@lace-lib/ui-toolkit';
import type { ScrollHandlerProcessed } from 'react-native-reanimated';

const GRID_COLUMNS = isWeb ? 4 : 3;
const GAP = spacing.M;

type NftFolderProps = {
  folderId: FolderId;
  onClose: () => void;
  onEdit: (folderId: FolderId) => void;
  editButtonDisabled?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  ListHeaderComponent?: ListHeaderComponentProperty<unknown>;
  scrollHandler?: ScrollHandlerProcessed<Record<string, unknown>>;
  listRef?: React.RefObject<FlatListRef | null>;
};

export const NftFolder = ({
  folderId,
  onClose,
  onEdit,
  editButtonDisabled = false,
  style,
  contentContainerStyle,
  ListHeaderComponent,
  scrollHandler,
  listRef,
}: NftFolderProps) => {
  const { theme } = useTheme();
  const nfts = useLaceSelector('tokens.selectNFTsByFolderId', folderId);
  const isPortfolioView = useLaceSelector('ui.getIsPortfolioView');

  const [containerWidth, setContainerWidth] = useState(0);

  const componentStyles = useMemo(() => styles(theme), [theme]);

  const horizontalPadding = useMemo(() => {
    const flattened = StyleSheet.flatten(contentContainerStyle) ?? {};
    const paddingHorizontal =
      typeof flattened.paddingHorizontal === 'number'
        ? flattened.paddingHorizontal
        : 0;
    const paddingLeft =
      typeof flattened.paddingLeft === 'number'
        ? flattened.paddingLeft
        : paddingHorizontal;
    const paddingRight =
      typeof flattened.paddingRight === 'number'
        ? flattened.paddingRight
        : paddingHorizontal;
    return { paddingLeft, paddingRight };
  }, [contentContainerStyle]);

  const itemSize = useMemo(
    () =>
      containerWidth > 0
        ? Math.max(
            0,
            (containerWidth -
              horizontalPadding.paddingLeft -
              horizontalPadding.paddingRight -
              GAP * (GRID_COLUMNS - 1)) /
              GRID_COLUMNS,
          )
        : 0,
    [
      containerWidth,
      horizontalPadding.paddingLeft,
      horizontalPadding.paddingRight,
    ],
  );

  const controlIconSize = useMemo(() => {
    const raw = (isWeb ? 0.1 : 0.2) * itemSize;
    return Math.max(12, Math.min(32, Math.round(raw)));
  }, [itemSize]);

  const itemDimensionStyle = useMemo(
    () => ({ width: itemSize, height: itemSize }),
    [itemSize],
  );

  type FolderGridItem =
    | { type: 'controls' }
    | { type: 'token'; token: (typeof nfts)[number] };

  const gridItems = useMemo<FolderGridItem[]>(() => {
    const tokenItems: FolderGridItem[] = nfts.map(token => ({
      type: 'token',
      token,
    }));

    return [{ type: 'controls' }, ...tokenItems];
  }, [nfts]);

  const handleEditFolder = useCallback(() => {
    onEdit(folderId);
  }, [onEdit, folderId]);

  const keyExtractor = useCallback((item: FolderGridItem) => {
    if (item.type === 'controls') return 'controls';
    return `token-${item.token.tokenId}`;
  }, []);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    setContainerWidth(event.nativeEvent.layout.width);
  }, []);

  const headerNode = useMemo(
    () => getListHeaderNode(ListHeaderComponent),
    [ListHeaderComponent],
  );

  const renderGridItem = useCallback(
    ({ item, index }: ListRenderItemInfo<FolderGridItem>) => {
      switch (item.type) {
        case 'controls':
          return (
            <View
              style={[componentStyles.controlsContainer, itemDimensionStyle]}>
              <IconButton.Static
                icon={<Icon name="ArrowLeft" size={controlIconSize} />}
                containerStyle={componentStyles.controlButton}
                testID="nft-folder-close-btn"
                onPress={onClose}
              />
              {!isPortfolioView && (
                <IconButton.Static
                  icon={<Icon name="FolderEdit" size={controlIconSize} />}
                  containerStyle={componentStyles.controlButton}
                  testID="nft-folder-edit-btn"
                  onPress={handleEditFolder}
                  disabled={editButtonDisabled}
                />
              )}
            </View>
          );
        case 'token': {
          const imageUri = getAssetImageUrl(item.token.metadata?.image);
          return (
            <NFTItem
              image={{ uri: imageUri }}
              label={item.token.displayLongName}
              size={itemSize}
              style={componentStyles.thumbnailContainer}
              testID={`nft-thumbnail-${index}`}
              onPress={() => {
                NavigationControls.sheets.navigate(
                  SheetRoutes.AssetDetailBottomSheet,
                  {
                    token: item.token,
                  },
                );
              }}
            />
          );
        }
      }
    },
    [
      componentStyles.controlsContainer,
      componentStyles.controlButton,
      componentStyles.thumbnailContainer,
      itemDimensionStyle,
      itemSize,
      onClose,
      handleEditFolder,
      editButtonDisabled,
      isPortfolioView,
    ],
  );

  return (
    <Animated.FlatList
      ref={listRef}
      testID="nft-folder-container"
      data={gridItems}
      keyExtractor={keyExtractor}
      renderItem={renderGridItem}
      onLayout={onLayout}
      numColumns={GRID_COLUMNS}
      onScroll={scrollHandler}
      scrollEventThrottle={16}
      columnWrapperStyle={componentStyles.columnWrapper}
      style={style}
      contentContainerStyle={contentContainerStyle}
      ListHeaderComponent={headerNode}
      showsVerticalScrollIndicator={false}
    />
  );
};

const styles = (theme: Theme) =>
  StyleSheet.create({
    columnWrapper: {
      gap: GAP,
    },
    controlsContainer: {
      aspectRatio: 1,
      marginBottom: GAP,
      alignItems: 'center',
      justifyContent: 'space-around',
      flexDirection: 'row',
    },
    controlButton: {
      borderRadius: radius.rounded,
      backgroundColor: theme.background.primary,
      padding: 10,
    },
    thumbnailContainer: {
      marginBottom: GAP,
    },
  });
