import type { LayoutChangeEvent } from 'react-native';

import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { radius, spacing } from '../../../../design-tokens';
import { Text } from '../../../atoms';

import type { Theme } from '../../../../design-tokens';

/** The bracket square's intended size; also its ceiling in a smaller frame. */
const SCAN_AREA_SIZE = 280;

export interface UrScannerViewProps {
  /** Reassembly progress in the range 0..1. */
  progress: number;
  /** Localised instruction shown beneath the scan area. */
  instruction: string;
  /** Localised, percent-formatted progress label (e.g. "42%"). */
  progressLabel: string;
  /** Optional decode/error message shown over the preview. */
  error?: string | null;
  /** Platform camera preview rendered behind the scan overlay. */
  camera: React.ReactNode;
  theme: Theme;
}

/**
 * Shared scan-area scaffolding and reassembly-progress overlay for the UR
 * scanner. Platform files supply the camera preview via {@link camera}; this
 * view owns only presentation so mobile and web stay visually identical.
 */
export const UrScannerView = ({
  progress,
  instruction,
  progressLabel,
  error,
  camera,
  theme,
}: UrScannerViewProps) => {
  const styles = getStyles(theme);
  const clampedProgress = Math.min(1, Math.max(0, progress));

  // The frame is measured so the bracket square can never exceed it. BOUNDED by
  // SCAN_AREA_SIZE rather than derived from it: in a full-screen host the frame
  // is larger than 280pt, so the square stays exactly 280 and nothing moves.
  // In a smaller host — a card-sized exchange overlay — a fixed 280 overflowed
  // and `overflow: 'hidden'` clipped the brackets off entirely.
  const [frame, setFrame] = useState<{ height: number; width: number }>();
  const handleFrameLayout = useCallback((event: LayoutChangeEvent) => {
    const { height, width } = event.nativeEvent.layout;
    setFrame({ height, width });
  }, []);
  const scanAreaSize =
    frame === undefined
      ? SCAN_AREA_SIZE
      : Math.max(
          0,
          Math.min(
            SCAN_AREA_SIZE,
            frame.width - spacing.M * 2,
            frame.height - spacing.M * 2,
          ),
        );

  return (
    <View style={styles.cameraContainer} onLayout={handleFrameLayout}>
      {camera}

      <View style={styles.overlay}>
        <View
          style={[
            styles.scanArea,
            { height: scanAreaSize, width: scanAreaSize },
          ]}>
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
        </View>

        {error ? (
          <View style={styles.errorContainer}>
            <Text.M style={styles.errorText}>{error}</Text.M>
          </View>
        ) : null}

        <View style={styles.progressContainer}>
          <Text.L style={styles.instructionText}>{instruction}</Text.L>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${clampedProgress * 100}%` },
              ]}
            />
          </View>
          <Text.M style={styles.progressLabel}>{progressLabel}</Text.M>
        </View>
      </View>
    </View>
  );
};

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    cameraContainer: {
      flex: 1,
      marginVertical: spacing.XXL,
      borderRadius: radius.L,
      overflow: 'hidden',
      position: 'relative',
    },
    overlay: {
      ...StyleSheet.absoluteFill,
      justifyContent: 'center',
      alignItems: 'center',
    },
    scanArea: {
      position: 'relative',
    },
    corner: {
      position: 'absolute',
      width: 50,
      height: 50,
      borderColor: theme.brand.white,
      borderWidth: 5,
    },
    topLeft: {
      top: 0,
      left: 0,
      borderBottomWidth: 0,
      borderRightWidth: 0,
      borderTopLeftRadius: radius.M,
    },
    topRight: {
      top: 0,
      right: 0,
      borderBottomWidth: 0,
      borderLeftWidth: 0,
      borderTopRightRadius: radius.M,
    },
    bottomLeft: {
      bottom: 0,
      left: 0,
      borderTopWidth: 0,
      borderRightWidth: 0,
      borderBottomLeftRadius: radius.M,
    },
    bottomRight: {
      bottom: 0,
      right: 0,
      borderTopWidth: 0,
      borderLeftWidth: 0,
      borderBottomRightRadius: radius.M,
    },
    progressContainer: {
      position: 'absolute',
      bottom: spacing.XXL,
      width: '80%',
      alignItems: 'center',
      gap: spacing.S,
    },
    instructionText: {
      color: theme.brand.white,
      textAlign: 'center',
    },
    progressTrack: {
      width: '100%',
      height: spacing.S,
      borderRadius: radius.M,
      backgroundColor: theme.background.primary,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: radius.M,
      backgroundColor: theme.brand.white,
    },
    progressLabel: {
      color: theme.brand.white,
      textAlign: 'center',
    },
    errorContainer: {
      position: 'absolute',
      top: spacing.XXL * 2,
      backgroundColor: theme.background.negative,
      paddingHorizontal: spacing.L,
      paddingVertical: spacing.M,
      borderRadius: spacing.S,
    },
    errorText: {
      color: theme.text.primary,
      textAlign: 'center',
    },
  });
