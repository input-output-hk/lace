import type {
  DimensionValue,
  StyleProp,
  ViewStyle,
  LayoutChangeEvent,
} from 'react-native';

import { Image } from 'expo-image';
import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from 'react';
import { StyleSheet, View, Pressable } from 'react-native';

import { radius, spacing, useTheme } from '../../../design-tokens';
import {
  getAssetImageUrl,
  getImageUri,
  getWebIpfsFallbackSource,
  isWeb,
} from '../../util';
import { Icon } from '../icons/Icon';
import { Text } from '../text/text';

import type { Theme } from '../../../design-tokens';
import type { ImageProps, ImageSource } from 'expo-image';

type ThumbnailProps = Omit<ImageProps, 'source'> & {
  label?: string;
  flexBasis?: DimensionValue;
  source: ImageSource;
  size?: number;
  onSelect?: () => void;
  containerStyle?: StyleProp<ViewStyle>;
  testID?: string;
};

export const Thumbnail = ({
  label,
  source,
  flexBasis,
  onSelect,
  size = 0,
  containerStyle,
  testID,
}: ThumbnailProps) => {
  const { theme } = useTheme();

  const [imageSize, setImageSize] = useState<number>(size);
  const [hasImageError, setHasImageError] = useState(false);
  const [fallbackSource, setFallbackSource] = useState<ImageSource | null>(
    null,
  );
  const isSizeDeterminedRef = useRef(size !== 0);

  // This atom hands a uri straight to expo-image, so the proxy + single-IPFS-
  // gateway rules are applied HERE rather than at each call site: callers that
  // pass raw token metadata (tokenGroupSummary among them) would otherwise
  // fetch attacker-controlled origins directly. Also refuses unsafe data: URIs
  // (M-301), which surface as the ImageNotFound fallback below.
  const sourceUri = useMemo(() => getImageUri(source), [source]);
  const normalizedUri = useMemo(() => getAssetImageUrl(sourceUri), [sourceUri]);
  const normalizedSource = useMemo<ImageSource | undefined>(
    () =>
      normalizedUri === undefined
        ? undefined
        : { ...source, uri: normalizedUri },
    [normalizedUri, source],
  );
  const resolvedSource = useMemo(
    () => fallbackSource ?? normalizedSource,
    [fallbackSource, normalizedSource],
  );
  const resolvedUri = resolvedSource ? getImageUri(resolvedSource) : undefined;
  const hasValidSource = !!resolvedUri && !hasImageError;

  useEffect(() => {
    if (size) {
      setImageSize(size);
      isSizeDeterminedRef.current = true;
    } else {
      // Size prop is/became undefined. Reset to allow layout to determine it.
      isSizeDeterminedRef.current = false;
    }
  }, [size]);

  useEffect(() => {
    setHasImageError(false);
    setFallbackSource(null);
  }, [normalizedUri]);

  const thumbnailStyles = useMemo(
    () => getStyles(imageSize, theme),
    [imageSize, theme],
  );

  const flexBasisStyle = useMemo(
    () => (flexBasis ? { flexBasis } : undefined),
    [flexBasis],
  );
  const pressableStyle = useMemo(
    () => [flexBasisStyle, containerStyle],
    [flexBasisStyle, containerStyle],
  );
  const containerViewStyle = useMemo(
    () => [
      thumbnailStyles.container,
      label ? thumbnailStyles.withLabel : undefined,
    ],
    [label, thumbnailStyles],
  );

  const handleImageError = useCallback(() => {
    // Retry from the url that actually failed, not the caller's raw uri: only
    // the resolved url tells the fallback whether the load was proxied (worth a
    // plain-gateway retry) or already the plain gateway (nothing to retry).
    const retrySource = !fallbackSource
      ? getWebIpfsFallbackSource(normalizedUri)
      : null;
    if (retrySource && !fallbackSource) {
      setFallbackSource(retrySource);
      return;
    }
    setHasImageError(true);
  }, [normalizedUri, fallbackSource]);

  const handleLayout = (event: LayoutChangeEvent) => {
    if (!isSizeDeterminedRef.current) {
      const { width } = event.nativeEvent.layout;
      if (width > 0) {
        const imageSize = isWeb ? width / 2 : width;
        setImageSize(imageSize);
        isSizeDeterminedRef.current = true;
      }
    }
  };

  const iconSize = useMemo(() => {
    return imageSize * 0.3 + 10;
  }, [imageSize]);

  return (
    <Pressable
      onPress={() => {
        onSelect?.();
      }}
      onLayout={handleLayout}
      style={pressableStyle}>
      <View testID={testID} style={containerViewStyle}>
        {hasValidSource ? (
          <Image
            style={thumbnailStyles.image}
            source={resolvedSource}
            contentFit="cover"
            onError={handleImageError}
          />
        ) : (
          <View style={thumbnailStyles.fallbackContainer}>
            <Icon name="ImageNotFound" size={iconSize} />
          </View>
        )}
        {label && <Text.XS style={thumbnailStyles.labelText}>{label}</Text.XS>}
      </View>
    </Pressable>
  );
};

const getStyles = (imageSize: number, theme: Theme) =>
  StyleSheet.create({
    container: {
      justifyContent: 'center',
      alignContent: 'center',
      alignItems: 'center',
      gap: spacing.M,
      borderRadius: radius.M,
      overflow: 'hidden',
      height: imageSize,
    },
    withLabel: {
      paddingBottom: spacing.L,
    },
    labelText: {
      paddingHorizontal: spacing.S,
    },
    image: {
      borderRadius: radius.M,
      width: imageSize,
      height: imageSize,
    },
    fallbackContainer: {
      width: imageSize,
      height: imageSize,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.background.tertiary,
      borderRadius: radius.M,
    },
  });
