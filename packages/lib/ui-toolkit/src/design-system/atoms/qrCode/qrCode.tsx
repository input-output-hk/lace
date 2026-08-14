import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, type LayoutChangeEvent } from 'react-native';
import QRCodeStyled, { useQRCodeData } from 'react-native-qrcode-styled';

import { radius, spacing } from '../../../design-tokens';
import { isExtensionSidePanel } from '../../util/commons';
import { Icon } from '../icons/Icon';

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

const FALLBACK_PIECE_SIZE = 5;

const ERROR_CORRECTION_LEVEL = 'Q' as const;

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
};

export const QrCode = ({
  data,
  chainType,
  testID,
  logoSize = 48,
  backgroundColor,
}: QrCodeProps) => {
  const qrCodeStyle = styles(backgroundColor);

  const qrCodeOptions: QRCodeOptions = useMemo(
    () => ({ errorCorrectionLevel: ERROR_CORRECTION_LEVEL }),
    [],
  );

  const { qrCodeSize } = useQRCodeDataSafe(data, qrCodeOptions);

  const [innerDrawSide, setInnerDrawSide] = useState(0);

  const onContainerLayout = useCallback(
    ({ nativeEvent: { layout } }: LayoutChangeEvent) => {
      const side = Math.min(layout.width, layout.height);
      const paddingInset = spacing.S * 2;
      setInnerDrawSide(Math.max(0, side - paddingInset));
    },
    [],
  );

  const pieceSize = useMemo(() => {
    if (qrCodeSize <= 0 || innerDrawSide <= 0) {
      return FALLBACK_PIECE_SIZE;
    }
    return innerDrawSide / qrCodeSize;
  }, [innerDrawSide, qrCodeSize]);

  const renderLogo = () => {
    if (!chainType) return;

    const iconPadding = spacing.S;
    const iconSize = logoSize - iconPadding * 2;

    return (
      <View
        testID={`qr-code-chain-icon-${chainType}`}
        style={[
          qrCodeStyle.logoContainer,
          {
            width: logoSize,
            height: logoSize,
            backgroundColor,
          },
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
      style={qrCodeStyle.container}
      testID={testID}
      onLayout={onContainerLayout}>
      <QRCodeStyled
        pieceCornerType="rounded"
        pieceBorderRadius={2}
        data={data}
        pieceSize={pieceSize}
        outerEyesOptions={{ borderRadius: spacing.S }}
        innerEyesOptions={{ borderRadius: spacing.XS }}
        color={QR_COLOR}
        errorCorrectionLevel={ERROR_CORRECTION_LEVEL}
      />
      {renderLogo()}
    </View>
  );
};

const styles = (backgroundColor?: string) =>
  StyleSheet.create({
    container: {
      position: 'relative',
      alignSelf: 'center',
      width: isExtensionSidePanel ? '50%' : '70%',
      aspectRatio: 1,
      maxWidth: isExtensionSidePanel ? '50%' : '70%',
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.S,
      backgroundColor: QR_BACKGROUND_COLOR,
      borderWidth: 1,
      borderColor: QR_COLOR,
      borderRadius: radius.XS,
      overflow: 'hidden',
    },
    logoContainer: {
      position: 'absolute',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: backgroundColor ?? 'transparent',
      borderRadius: radius.L,
      padding: spacing.M,
    },
  });
