import {
  useTheme,
  getAssetImageUrl,
  Card,
  Text,
  spacing,
  radius,
  Icon,
  isWeb,
} from '@lace-lib/ui-toolkit';
import { Image } from 'expo-image';
import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Pressable } from 'react-native-gesture-handler';

import { useLaceSelector } from '../../../hooks';

import type { FolderId } from '@lace-contract/tokens';
import type { Theme } from '@lace-lib/ui-toolkit';

const MAX_THUMBNAILS = 4;
const DEFAULT_THUMBNAIL_SIZE = isWeb ? 44 : 28;

const formatFolderCount = (count: number): string =>
  count > 99 ? '99+' : `${count}`;

type NftFolderThumbnailProps = {
  folderId: FolderId;
  folderName: string;
  onPress: (folderId: FolderId) => void;
  testID?: string;
};

export const NftFolderThumbnail = ({
  folderId,
  folderName,
  onPress,
  testID,
}: NftFolderThumbnailProps) => {
  const { theme } = useTheme();
  const nfts = useLaceSelector('tokens.selectNFTsByFolderId', folderId);

  const [cardWidth, setCardWidth] = useState<number>(0);

  const thumbnailSize = useMemo(() => {
    if (cardWidth <= 0) return DEFAULT_THUMBNAIL_SIZE;

    const padding = spacing.M * 2;
    const available = Math.max(0, cardWidth - padding);
    const size = (available - spacing.M) / 2;

    return Math.max(12, Math.floor(size));
  }, [cardWidth]);

  const fallbackIconSize = useMemo(
    () => Math.max(12, Math.round(thumbnailSize * 0.6)),
    [thumbnailSize],
  );

  const componentStyles = useMemo(
    () => styles(theme, thumbnailSize),
    [theme, thumbnailSize],
  );

  const thumbnails = useMemo(
    () =>
      nfts.slice(0, MAX_THUMBNAILS).map(nft => {
        const imageUrl = getAssetImageUrl(nft.metadata?.image);
        if (imageUrl) {
          return (
            <Image
              key={nft.tokenId}
              style={componentStyles.thumbnailImage}
              source={{ uri: imageUrl }}
            />
          );
        }
        return (
          <View
            key={nft.tokenId}
            style={[
              componentStyles.thumbnailImage,
              componentStyles.thumbnailFallback,
            ]}>
            <Icon name="ImageNotFound" size={fallbackIconSize} />
          </View>
        );
      }),
    [nfts, componentStyles, fallbackIconSize],
  );
  const handlePress = useCallback(() => {
    onPress(folderId);
  }, [onPress, folderId]);

  const handleCardLayout = useCallback((event: LayoutChangeEvent) => {
    setCardWidth(event.nativeEvent.layout.width);
  }, []);

  return (
    <Pressable onPress={handlePress} testID={testID}>
      <Card cardStyle={componentStyles.card} onLayout={handleCardLayout}>
        <Text.XS
          numberOfLines={1}
          ellipsizeMode="tail"
          style={componentStyles.countBadge}
          testID={`folder-item-count-badge-${folderId}`}>
          {formatFolderCount(nfts.length)}
        </Text.XS>
        {thumbnails}
        <Text.XS
          numberOfLines={1}
          style={componentStyles.nameLabel}
          testID={`nft-folder-name-${folderId}`}>
          {folderName}
        </Text.XS>
      </Card>
    </Pressable>
  );
};

const styles = (theme: Theme, thumbnailSize: number) =>
  StyleSheet.create({
    thumbnailImage: {
      width: thumbnailSize,
      height: thumbnailSize,
      borderRadius: radius.rounded,
    },
    thumbnailFallback: {
      backgroundColor: theme.background.tertiary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    card: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      aspectRatio: 1,
      padding: spacing.M,
      gap: spacing.M,
    },
    countBadge: {
      position: 'absolute',
      top: 0,
      right: 0,
      backgroundColor: theme.background.negative,
      borderRadius: radius.rounded,
      width: 35,
      height: 35,
      textAlign: 'center',
      lineHeight: 35,
      zIndex: 1,
    },
    nameLabel: {
      position: 'absolute',
      bottom: spacing.S,
      textAlign: 'center',
      color: theme.text.primary,
      zIndex: 10,
      backgroundColor: theme.background.overlay,
      paddingHorizontal: spacing.S,
      paddingVertical: spacing.XS,
      borderRadius: radius.S,
    },
  });
