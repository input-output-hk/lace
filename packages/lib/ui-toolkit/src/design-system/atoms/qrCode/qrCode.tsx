import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, type LayoutChangeEvent } from 'react-native';
import QRCodeStyled, { useQRCodeData } from 'react-native-qrcode-styled';

import { radius, spacing } from '../../../design-tokens';
import { isExtensionSidePanel } from '../../util/commons';
import { Icon } from '../icons/Icon';

import { FALLBACK_PIECE_SIZE, qrDrawMetrics } from './qrDrawMetrics';

import type { BlockchainName } from '@lace-lib/util-store';
import type { QRCodeOptions } from 'qrcode';

/**
 * QR colors are intentionally theme-independent. ISO/IEC 18004 defines QR
 * codes as dark modules on a light background with a light quiet zone;
 * hardware wallet cameras (Keystone, SeedSigner) reject the inverted
 * white-on-dark variant, so dark theme must never repaint these.
 */
const QR_COLOR = '#1E1E1E';
const QR_BACKGROUND_COLOR = '#FFFFFF';
/** Maximum contrast for a camera; the decorative near-black is a design choice. */
const DEVICE_CAMERA_QR_COLOR = '#000000';

const BRIGHTNESS_MIDPOINT = 128;

type Rgb = { r: number; g: number; b: number };

/** Parses #RRGGBB or #RRGGBBAA, compositing alpha over the white plate. */
const parseBadgeColor = (color: string): Rgb | undefined => {
  const match = /^#([0-9A-Fa-f]{6})([0-9A-Fa-f]{2})?$/.exec(color);
  if (!match) return undefined;
  const value = Number.parseInt(match[1], 16);
  const alpha = match[2] ? Number.parseInt(match[2], 16) / 255 : 1;
  const blend = (channel: number) => channel * alpha + 255 * (1 - alpha);
  return {
    r: blend((value >> 16) & 0xff),
    g: blend((value >> 8) & 0xff),
    b: blend(value & 0xff),
  };
};

/** Perceived brightness (ITU-R BT.601), 0-255. */
const brightness = ({ r, g, b }: Rgb): number =>
  0.299 * r + 0.587 * g + 0.114 * b;

/** White logo on dark badges; QR_COLOR on light badges or the bare plate. */
const logoColorOn = (badgeColor?: string): string => {
  const badge = badgeColor ? parseBadgeColor(badgeColor) : undefined;
  if (!badge) return QR_COLOR;
  return brightness(badge) < BRIGHTNESS_MIDPOINT
    ? QR_BACKGROUND_COLOR
    : QR_COLOR;
};

const ERROR_CORRECTION_LEVEL = 'Q' as const;
/**
 * Level M for a device camera, not Q. Lower correction means FEWER modules for
 * the same payload (a 215-char UR part is 49 across at M, 57 at Q), and module
 * SIZE is what a camera actually needs. The per-frame redundancy Q buys is
 * already provided across frames by the UR fountain: a misread frame comes back
 * on the next loop, while denser modules are misread on every frame.
 */
const DEVICE_CAMERA_ERROR_CORRECTION_LEVEL = 'M' as const;

const useQRCodeDataSafe = useQRCodeData as unknown as (
  message: string,
  options: QRCodeOptions,
) => { qrCodeSize: number };

type QrCodeProps = {
  data: string;
  chainType?: BlockchainName;
  testID?: string;
  logoSize?: number;
  backgroundColor?: string;
  /**
   * Render for a hardware wallet's camera rather than for a person.
   *
   * Every decorative choice this component makes costs machine readability, and
   * the animated exchange is read by a device across a desk: rounded pieces blur
   * their own edges, `#1E1E1E` is not the maximum contrast the spec assumes, a
   * fixed 8px padding is half the quiet zone at these densities, a dark border
   * sits right where the decoder looks for that zone, and 70% (50% in the side
   * panel) of a 400px card leaves ~4px per module — 2.8px in the panel.
   *
   * Set by {@link AnimatedQrCode}, since every animated consumer in both stacks
   * is a device camera. Left OFF for Receive and Account Key, which a human
   * points a phone at.
   */
  optimiseForDeviceCamera?: boolean;
};

export const QrCode = ({
  data,
  chainType,
  testID,
  logoSize = 48,
  backgroundColor,
  optimiseForDeviceCamera = false,
}: QrCodeProps) => {
  const errorCorrectionLevel = optimiseForDeviceCamera
    ? DEVICE_CAMERA_ERROR_CORRECTION_LEVEL
    : ERROR_CORRECTION_LEVEL;

  const qrCodeOptions: QRCodeOptions = useMemo(
    () => ({ errorCorrectionLevel }),
    [errorCorrectionLevel],
  );

  const { qrCodeSize } = useQRCodeDataSafe(data, qrCodeOptions);

  const [containerSide, setContainerSide] = useState(0);

  const onContainerLayout = useCallback(
    ({ nativeEvent: { layout } }: LayoutChangeEvent) => {
      setContainerSide(Math.min(layout.width, layout.height));
    },
    [],
  );

  const { pieceSize, quietZone } = useMemo(() => {
    if (optimiseForDeviceCamera) {
      return qrDrawMetrics({ moduleCount: qrCodeSize, side: containerSide });
    }
    const inner = Math.max(0, containerSide - spacing.S * 2);
    return {
      pieceSize:
        qrCodeSize <= 0 || inner <= 0
          ? FALLBACK_PIECE_SIZE
          : inner / qrCodeSize,
      quietZone: spacing.S,
    };
  }, [containerSide, optimiseForDeviceCamera, qrCodeSize]);

  const renderLogo = () => {
    if (!chainType) return;

    const iconPadding = spacing.S;
    const iconSize = logoSize - iconPadding * 2;

    return (
      <View
        testID={`qr-code-chain-icon-${chainType}`}
        style={[
          styles.logoContainer,
          { backgroundColor, height: logoSize, width: logoSize },
        ]}>
        <Icon
          name={chainType}
          color={logoColorOn(backgroundColor)}
          size={100}
          height={iconSize}
          width={iconSize}
        />
      </View>
    );
  };

  return (
    <View
      style={[
        styles.container,
        optimiseForDeviceCamera
          ? styles.deviceCameraContainer
          : styles.decorativeContainer,
        { padding: quietZone },
      ]}
      testID={testID}
      onLayout={onContainerLayout}>
      {/*
        Nothing until measured, in camera mode: the fallback module size is a
        guess, and a guess too large is drawn CROPPED by `overflow: hidden` and
        then replaced once layout arrives — the flash the QA recording caught.
        One blank frame beats one wrong one.
      */}
      {optimiseForDeviceCamera && containerSide <= 0 ? undefined : (
        <QRCodeStyled
          // Square pieces for a camera: rounded ones cost a per-module corner
          // analysis on EVERY frame (the animated QR's ANR) and soften the very
          // edges the decoder thresholds on.
          {...(optimiseForDeviceCamera
            ? {}
            : {
                innerEyesOptions: { borderRadius: spacing.XS },
                outerEyesOptions: { borderRadius: spacing.S },
                pieceBorderRadius: 2,
                pieceCornerType: 'rounded' as const,
              })}
          data={data}
          pieceSize={pieceSize}
          color={optimiseForDeviceCamera ? DEVICE_CAMERA_QR_COLOR : QR_COLOR}
          errorCorrectionLevel={errorCorrectionLevel}
        />
      )}
      {renderLogo()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignSelf: 'center',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: QR_BACKGROUND_COLOR,
    overflow: 'hidden',
  },
  decorativeContainer: {
    width: isExtensionSidePanel ? '50%' : '70%',
    maxWidth: isExtensionSidePanel ? '50%' : '70%',
    borderWidth: 1,
    borderColor: QR_COLOR,
    borderRadius: radius.XS,
  },
  // Nearly the full card, and NO border: at these densities the panel's 50%
  // left ~2.8px per module, and a dark border sits exactly where the decoder
  // looks for the quiet zone.
  deviceCameraContainer: {
    width: '96%',
    maxWidth: '96%',
  },
  logoContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radius.L,
    padding: spacing.M,
  },
});
