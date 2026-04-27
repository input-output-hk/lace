import type { StyleProp, ViewStyle, ImageURISource } from 'react-native';

import { Image } from 'expo-image';
import React, { useMemo, useState, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme, radius } from '../../../design-tokens';
import { BlurredLabel } from '../../atoms';
import { BlurView } from '../../atoms/blur-view/blur-view';
import { Icon } from '../../atoms/icons/Icon';
import { Text } from '../../atoms/text/text';

import type { Theme } from '../../../design-tokens';

type NFTFolderProps = {
  images: ImageURISource[];
  label?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export const NFTFolder = ({ images, label, style, testID }: NFTFolderProps) => {
  const { theme } = useTheme();
  const [measuredSize, setMeasuredSize] = useState<number | null>(null);

  const hasExplicitSize = useMemo(() => {
    if (style) {
      const flattenedStyle = StyleSheet.flatten(style);
      return flattenedStyle && typeof flattenedStyle.width === 'number';
    }
    return false;
  }, [style]);

  const containerSize = useMemo(() => {
    // Check for explicit width in style first
    if (style) {
      const flattenedStyle = StyleSheet.flatten(style);
      if (flattenedStyle && typeof flattenedStyle.width === 'number') {
        return flattenedStyle.width;
      }
    }
    // If no explicit width, use measured size from onLayout
    if (measuredSize !== null) {
      return measuredSize;
    }
    return 90;
  }, [style, measuredSize]);

  const handleLayout = useCallback(
    (event: { nativeEvent: { layout: { width: number } } }) => {
      // Only measure if we don't have an explicit size
      if (!hasExplicitSize) {
        const { width } = event.nativeEvent.layout;
        setMeasuredSize(width);
      }
    },
    [hasExplicitSize],
  );

  const imageSize = useMemo(
    () => Math.floor(containerSize * 0.35),
    [containerSize],
  );
  const imageGap = useMemo(
    () => Math.floor(containerSize * 0.089),
    [containerSize],
  );
  const containerPadding = useMemo(
    () => Math.floor(containerSize * 0.089),
    [containerSize],
  );
  const badgeSize = useMemo(
    () => Math.floor(containerSize * 0.222),
    [containerSize],
  );
  const labelMargin = useMemo(
    () => Math.max(2, Math.floor(containerSize * 0.022)),
    [containerSize],
  );

  const labelSize = useMemo(
    () => (containerSize >= 110 ? 'S' : 'XS'),
    [containerSize],
  );

  const styles = getStyles({
    theme,
    containerSize,
    imageSize,
    imageGap,
    containerPadding,
    badgeSize,
    labelMargin,
  });

  const totalCount = images.length;
  const displayImages = useMemo(() => images.slice(0, 4), [images]);

  const renderGridImages = () => (
    <View style={styles.imagesContainer}>
      {displayImages.map((image, index) => {
        // Support: { uri: string }, string URLs, and number (local assets)
        const isValidImage =
          image &&
          (image.uri || typeof image === 'string' || typeof image === 'number');

        return isValidImage ? (
          <Image
            key={index}
            source={image}
            style={styles.nftImage}
            contentFit="cover"
          />
        ) : null;
      })}
    </View>
  );

  const renderFolderIcon = () => (
    <View style={styles.folderIconContainer}>
      <Icon name="Folder01" size={32} />
    </View>
  );

  return (
    <BlurView
      style={[styles.folderContainer, style]}
      testID={testID}
      onLayout={handleLayout}>
      {totalCount > 0 ? renderGridImages() : renderFolderIcon()}
      {!!label && (
        <View style={styles.labelOverlay}>
          <BlurredLabel
            text={label}
            size={labelSize}
            style={styles.labelPadding}
          />
        </View>
      )}
      <View style={styles.badgeContainer}>
        {containerSize >= 130 ? (
          <Text.M>{totalCount}</Text.M>
        ) : (
          <Text.XS>{totalCount}</Text.XS>
        )}
      </View>
    </BlurView>
  );
};

const getStyles = ({
  theme,
  containerSize,
  imageSize,
  imageGap,
  containerPadding,
  badgeSize,
  labelMargin,
}: {
  theme: Theme;
  containerSize: number;
  imageSize: number;
  imageGap: number;
  containerPadding: number;
  badgeSize: number;
  labelMargin: number;
}) =>
  StyleSheet.create({
    folderContainer: {
      backgroundColor: theme.background.primary,
      borderRadius: radius.S,
      borderWidth: 1,
      borderColor: theme.border.middle,
      padding: containerPadding,
      aspectRatio: 1,
      position: 'relative',
      overflow: 'hidden',
    },
    imagesContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: imageGap,
    },
    nftImage: {
      width: imageSize,
      height: imageSize,
      borderRadius: radius.XS,
    },
    folderIconContainer: {
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    },
    labelOverlay: {
      position: 'absolute',
      bottom: labelMargin,
      left: labelMargin,
      right: labelMargin,
    },
    labelPadding: {
      paddingVertical: Math.max(2, Math.floor(containerSize * 0.044)),
      paddingHorizontal: Math.max(4, Math.floor(containerSize * 0.089)),
    },
    badgeContainer: {
      position: 'absolute',
      top: labelMargin,
      right: labelMargin,
      width: badgeSize,
      height: badgeSize,
      borderRadius: badgeSize / 2,
      backgroundColor: theme.brand.ascending,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10,
    },
  });
