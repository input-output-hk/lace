import type {
  FlatList as FlatListRef,
  LayoutChangeEvent,
  ListRenderItemInfo,
  StyleProp,
  ViewStyle,
} from 'react-native';

import { useTranslation } from '@lace-contract/i18n';
import { NavigationControls, SheetRoutes } from '@lace-lib/navigation';
import {
  NFTItem,
  useTheme,
  getAssetImageUrl,
  spacing,
  Icon,
  radius,
  isWeb,
} from '@lace-lib/ui-toolkit';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { type FlatList, StyleSheet, View } from 'react-native';
import { Pressable } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';

import { useDispatchLaceAction, useLaceSelector } from '../../../hooks';
import { PortfolioEmptyState } from '../empty-state';
import { getListHeaderNode } from '../utils/getListHeaderNode';

import { NftFolder } from './nft-folder';
import { NftFolderThumbnail } from './nft-folder-thumbnail';

import type { ListHeaderComponentProperty, SelectedAssetView } from '../types';
import type { FolderId, Token } from '@lace-contract/tokens';
import type { AccountId } from '@lace-contract/wallet-repo';
import type { Theme } from '@lace-lib/ui-toolkit';
import type { ScrollHandlerProcessed } from 'react-native-reanimated';

const GRID_COLUMNS = isWeb ? 4 : 3;
const PADDING_BOTTOM = spacing.XXXXL * 3;
const PADDING_HORIZONTAL = spacing.M;
const GAP = spacing.M;

export type NftGridItem =
  | { type: 'create-folder' }
  | { type: 'folder'; folderId: FolderId; folderName: string }
  | { type: 'token'; token: Token };

export const NftsList = ({
  accountId,
  activeIndex,
  selectedAssetView,
  style,
  ListHeaderComponent,
  scrollHandler,
  footerSpacerHeight,
  contentTopInset,
  listRef,
}: {
  accountId: AccountId;
  activeIndex: number;
  selectedAssetView: SelectedAssetView;
  style?: StyleProp<ViewStyle>;
  ListHeaderComponent?: ListHeaderComponentProperty<NftGridItem>;
  scrollHandler: ScrollHandlerProcessed<Record<string, unknown>>;
  footerSpacerHeight?: number;
  contentTopInset?: number;
  listRef?: React.RefObject<FlatListRef | null>;
}) => {
  // Custom hooks
  const { t } = useTranslation();
  const { theme } = useTheme();
  const internalListRef = useRef<FlatList>(null);
  const resolvedListRef = listRef ?? internalListRef;

  useEffect(() => {
    resolvedListRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [activeIndex, selectedAssetView, resolvedListRef]);

  const setSelectedFolderId = useDispatchLaceAction('ui.setSelectedFolderId');
  const allGroupedNfts = useLaceSelector(
    'tokens.selectNFTsGroupedInFoldersForVisibleAccounts',
  );
  const accountGroupedNfts = useLaceSelector(
    'tokens.selectNFTsGroupedInFoldersByAccountId',
    accountId,
  );
  const isPortfolioView = useLaceSelector('ui.getIsPortfolioView');
  const openFolderId = useLaceSelector('ui.getSelectedFolderId');

  // State
  const [containerWidth, setContainerWidth] = useState(0);
  const [listHeight, setListHeight] = useState(0);

  // Memos
  const styles = useMemo(() => getStyles(theme), [theme]);
  const contentContainerStyle = useMemo(
    () => [
      styles.contentContainerStyle,
      contentTopInset ? { paddingTop: contentTopInset } : null,
    ],
    [styles.contentContainerStyle, contentTopInset],
  );

  const filteredGroupedNfts = useMemo(
    () => (isPortfolioView ? allGroupedNfts : accountGroupedNfts),
    [isPortfolioView, allGroupedNfts, accountGroupedNfts],
  );

  const nftGridItems = useMemo<NftGridItem[]>(() => {
    const hasNfts =
      filteredGroupedNfts.folders.some(folder => folder.tokens.length > 0) ||
      filteredGroupedNfts.nonFolderTokens.length > 0;

    if (!hasNfts) return [];

    const folderItems: NftGridItem[] = filteredGroupedNfts.folders.map(
      folder => ({
        type: 'folder',
        folderId: folder.id,
        folderName: folder.name,
      }),
    );
    const tokenItems: NftGridItem[] = filteredGroupedNfts.nonFolderTokens.map(
      token => ({
        type: 'token',
        token,
      }),
    );

    // Only include create-folder button in account view (not portfolio view) or if there are no tokens
    if (isPortfolioView || filteredGroupedNfts.nonFolderTokens.length === 0) {
      return [...folderItems, ...tokenItems];
    }

    return [{ type: 'create-folder' }, ...folderItems, ...tokenItems];
  }, [filteredGroupedNfts, isPortfolioView]);

  const isCreateFolderDisabled = useMemo(
    () => filteredGroupedNfts.nonFolderTokens.length === 0,
    [filteredGroupedNfts.nonFolderTokens.length],
  );

  const itemSize = useMemo(
    () =>
      (containerWidth - PADDING_HORIZONTAL * 2 - GAP * (GRID_COLUMNS - 1)) /
      GRID_COLUMNS,
    [containerWidth],
  );

  const itemDimensionStyle = useMemo(
    () => ({ width: itemSize, height: itemSize }),
    [itemSize],
  );

  const emptyStateMessage = useMemo(() => t('v2.emptystate.nft.copy'), [t]);

  // Callbacks
  const handleEditFolder = useCallback(() => {
    if (openFolderId) {
      NavigationControls.sheets.navigate(SheetRoutes.EditFolder, {
        folderId: openFolderId,
        accountId,
      });
    }
  }, [openFolderId, accountId]);

  const handleCreateFolder = useCallback(() => {
    NavigationControls.sheets.navigate(SheetRoutes.CreateFolder, {
      accountId,
    });
  }, [accountId]);

  const handleFolderSelect = useCallback(
    (folderId: FolderId) => {
      setSelectedFolderId(folderId);
    },
    [setSelectedFolderId],
  );

  const handleCloseFolder = useCallback(() => {
    setSelectedFolderId(null);
  }, [setSelectedFolderId]);

  const handleSelectToken = useCallback(
    (token: (typeof filteredGroupedNfts.nonFolderTokens)[number]) => {
      NavigationControls.sheets.navigate(SheetRoutes.AssetDetailBottomSheet, {
        token,
      });
    },
    [],
  );

  const keyExtractor = useCallback((item: NftGridItem) => {
    if (item.type === 'create-folder') return 'create-folder';
    if (item.type === 'folder') return `folder-${item.folderId}`;
    return `token-${item.token.tokenId}`;
  }, []);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    setContainerWidth(event.nativeEvent.layout.width);
    setListHeight(Math.round(event.nativeEvent.layout.height));
  }, []);

  const renderGridItem = useCallback(
    ({ item, index }: ListRenderItemInfo<NftGridItem>) => {
      switch (item.type) {
        case 'create-folder':
          return (
            <View style={[styles.createFolderGridItem, itemDimensionStyle]}>
              <Pressable
                style={styles.createFolderButton}
                disabled={isCreateFolderDisabled}
                testID="create-folder-btn"
                onPress={handleCreateFolder}>
                <Icon name="FolderAdd" size={itemSize * 0.3} />
              </Pressable>
            </View>
          );
        case 'folder':
          return (
            <View
              style={[styles.folderGridItem, itemDimensionStyle]}
              testID={`nft-folder-item-${index}`}>
              <NftFolderThumbnail
                folderId={item.folderId}
                folderName={item.folderName}
                onPress={handleFolderSelect}
                testID={`nft-folder-thumbnail-${index}`}
              />
            </View>
          );
        case 'token': {
          return (
            <NFTItem
              image={{ uri: getAssetImageUrl(item.token.metadata?.image) }}
              label={item.token.displayLongName}
              size={itemSize}
              style={styles.thumbnailGridItem}
              testID={`nft-thumbnail-${index}`}
              onPress={() => {
                handleSelectToken(item.token);
              }}
            />
          );
        }
      }
    },
    [
      styles.createFolderGridItem,
      styles.createFolderButton,
      styles.folderGridItem,
      styles.thumbnailGridItem,
      itemDimensionStyle,
      itemSize,
      isCreateFolderDisabled,
      handleCreateFolder,
      handleFolderSelect,
      handleSelectToken,
    ],
  );

  const renderEmptyComponent = useCallback(
    () => (
      <PortfolioEmptyState
        iconName="ImageCompositionOval"
        message={emptyStateMessage}
      />
    ),
    [emptyStateMessage],
  );

  useEffect(() => {
    return () => {
      // cleanup the selected folder id when the component unmounts
      setSelectedFolderId(null);
    };
  }, [isPortfolioView, accountId, setSelectedFolderId]);

  const isEmpty = nftGridItems.length === 0;
  const listHeaderNode = useMemo(
    () => getListHeaderNode(ListHeaderComponent),
    [ListHeaderComponent],
  );
  const headerComponent = useMemo(() => {
    return (
      <>
        {listHeaderNode}
        {isEmpty && renderEmptyComponent()}
      </>
    );
  }, [listHeaderNode, isEmpty, renderEmptyComponent]);

  const mergedContentContainerStyle = useMemo(() => {
    const base = contentContainerStyle;
    if (!footerSpacerHeight || nftGridItems.length > 2 || listHeight <= 0)
      return base;
    return [
      base,
      {
        minHeight: listHeight + footerSpacerHeight,
      },
    ];
  }, [
    contentContainerStyle,
    footerSpacerHeight,
    nftGridItems.length,
    listHeight,
  ]);

  if (openFolderId) {
    return (
      <NftFolder
        folderId={openFolderId}
        onClose={handleCloseFolder}
        onEdit={handleEditFolder}
        style={style}
        contentContainerStyle={contentContainerStyle}
        ListHeaderComponent={listHeaderNode}
        scrollHandler={scrollHandler}
        listRef={resolvedListRef}
      />
    );
  }

  return (
    <Animated.FlatList
      ref={resolvedListRef}
      testID="nft-list-container"
      data={nftGridItems}
      keyExtractor={keyExtractor}
      renderItem={renderGridItem}
      onLayout={onLayout}
      ListEmptyComponent={null}
      numColumns={GRID_COLUMNS}
      onScroll={scrollHandler}
      scrollEventThrottle={16}
      columnWrapperStyle={styles.columnWrapper}
      style={style}
      contentContainerStyle={mergedContentContainerStyle}
      ListHeaderComponent={headerComponent}
      bounces={!isEmpty}
      showsVerticalScrollIndicator={false}
    />
  );
};

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    contentContainerStyle: {
      paddingHorizontal: PADDING_HORIZONTAL,
      paddingBottom: PADDING_BOTTOM,
    },
    columnWrapper: {
      gap: GAP,
    },
    createFolderGridItem: {
      aspectRatio: 1,
      marginBottom: GAP,
      justifyContent: 'center',
      alignItems: 'center',
    },
    createFolderButton: {
      borderRadius: radius.rounded,
      backgroundColor: theme.background.primary,
      padding: 10,
      flex: 1,
      aspectRatio: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    folderGridItem: {
      aspectRatio: 1,
      marginBottom: GAP,
      justifyContent: 'center',
    },
    thumbnailGridItem: {
      marginBottom: GAP,
    },
  });
