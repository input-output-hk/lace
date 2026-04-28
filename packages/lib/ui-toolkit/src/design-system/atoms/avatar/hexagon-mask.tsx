import { Image } from 'expo-image';
import React, { useMemo } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import Svg, {
  Defs,
  ClipPath,
  Polygon,
  Image as SvgImage,
  Text as SvgText,
  ForeignObject,
} from 'react-native-svg';

import { Icon } from '../icons/Icon';

interface HexagonMaskProps {
  size: number;
  imageUri?: string;
  fallbackText?: string;
  backgroundColor: string;
  textColor: string;
  isShielded?: boolean;
  shieldColor?: string;
  shouldShowIcon?: boolean;
}

const SHIELD_BORDER_WIDTH = 3;

export const HexagonMask = ({
  size,
  imageUri,
  fallbackText,
  backgroundColor,
  textColor,
  isShielded = false,
  shieldColor = '#4A1DD8',
  shouldShowIcon = false,
}: HexagonMaskProps) => {
  const center = size / 2;
  const radius = center * 0.95;
  const outerRadius = radius;
  const innerRadius = isShielded ? radius - SHIELD_BORDER_WIDTH : radius;

  const { outerPoints, innerPoints, clipId } = useMemo(() => {
    const getHexagonPoints = (hexRadius: number) => {
      const points = [];
      for (let index = 0; index < 6; index++) {
        const angle = (index * Math.PI) / 3 + Math.PI / 6;
        const x = center + hexRadius * Math.cos(angle);
        const y = center + hexRadius * Math.sin(angle);
        points.push(`${x},${y}`);
      }
      return points.join(' ');
    };

    return {
      outerPoints: getHexagonPoints(outerRadius),
      innerPoints: getHexagonPoints(innerRadius),
      clipId: `hexagon-clip-${size}-${Math.random()
        .toString(36)
        .substring(2, 9)}`,
    };
  }, [size, isShielded]);

  const styles = getStyles(size);

  return (
    <View style={styles.container}>
      {imageUri && (
        <View style={styles.imageContainer}>
          <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <Defs>
              <ClipPath id={`${clipId}-img`}>
                <Polygon points={isShielded ? innerPoints : outerPoints} />
              </ClipPath>
            </Defs>
            {Platform.OS === 'ios' ? (
              <ForeignObject
                x={0}
                y={0}
                width={size}
                height={size}
                clipPath={`url(#${clipId}-img)`}>
                <Image source={{ uri: imageUri }} style={styles.image} />
              </ForeignObject>
            ) : (
              <SvgImage
                x={0}
                y={0}
                width={size}
                height={size}
                href={imageUri}
                clipPath={`url(#${clipId}-img)`}
                preserveAspectRatio="xMidYMid slice"
              />
            )}
          </Svg>
        </View>
      )}
      <Svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={styles.svg}>
        <Defs>
          <ClipPath id={clipId}>
            <Polygon points={innerPoints} />
          </ClipPath>
        </Defs>

        <Polygon
          points={isShielded ? outerPoints : innerPoints}
          fill={imageUri ? 'transparent' : backgroundColor}
        />

        {isShielded && (
          <Polygon
            points={outerPoints}
            fill="none"
            stroke={shieldColor}
            strokeWidth={SHIELD_BORDER_WIDTH}
          />
        )}

        {!imageUri && !shouldShowIcon && (
          <SvgText
            x={center}
            y={center + size * 0.1}
            textAnchor="middle"
            fontSize={size * 0.3}
            fill={textColor}
            clipPath={`url(#${clipId})`}>
            {fallbackText?.slice(0, 2)}
          </SvgText>
        )}
      </Svg>

      {shouldShowIcon && (
        <View style={styles.iconOverlay}>
          <Icon name="ImageNotFound" />
        </View>
      )}
    </View>
  );
};

const getStyles = (size: number) =>
  StyleSheet.create({
    container: {
      width: size,
      height: size,
      overflow: 'hidden',
    },
    imageContainer: {
      position: 'absolute',
      width: size,
      height: size,
      top: 0,
      left: 0,
    },
    image: {
      width: size,
      height: size,
    },
    hexagonContainer: {
      width: size,
      height: size,
      overflow: 'hidden',
      justifyContent: 'center',
      alignItems: 'center',
    },
    hexagonOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: size,
      height: size,
      backgroundColor: 'transparent',
    },
    svg: {
      position: 'absolute',
    },
    iconOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: size,
      height: size,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
