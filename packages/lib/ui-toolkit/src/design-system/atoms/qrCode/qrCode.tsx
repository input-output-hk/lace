import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, type LayoutChangeEvent } from 'react-native';
import QRCodeStyled, { useQRCodeData } from 'react-native-qrcode-styled';

import { useTheme, radius, spacing } from '../../../design-tokens';
import { isExtensionSidePanel } from '../../util/commons';
import { Icon } from '../icons/Icon';

import type { Theme } from '../../../design-tokens';
import type { BlockchainName } from '@lace-lib/util-store';
import type { QRCodeOptions } from 'qrcode';

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
  const { theme } = useTheme();
  const qrCodeStyle = styles(theme, backgroundColor);

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
        style={[
          qrCodeStyle.logoContainer,
          {
            width: logoSize,
            height: logoSize,
            backgroundColor,
          },
        ]}>
        <Icon name={chainType} size={100} height={iconSize} width={iconSize} />
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
        color={theme.text.primary}
        errorCorrectionLevel={ERROR_CORRECTION_LEVEL}
      />
      {renderLogo()}
    </View>
  );
};

const styles = (theme: Theme, backgroundColor?: string) =>
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
      borderWidth: 1,
      borderColor: theme.text.primary,
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
