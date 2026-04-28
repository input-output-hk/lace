import { QrScannerSheet } from '@lace-lib/ui-toolkit';
import React, { useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { useQrScanner } from './useQrScanner';

import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

const SHEET_HEIGHT_RATIO = 0.7;

export const QrScanner = (props: SheetScreenProps<SheetRoutes.QrScanner>) => {
  const { qrScannerProps } = useQrScanner(props);
  const { height: windowHeight } = useWindowDimensions();

  const containerStyle = useMemo(
    () => [styles.container, { height: windowHeight * SHEET_HEIGHT_RATIO }],
    [windowHeight],
  );

  return (
    <View style={containerStyle}>
      <QrScannerSheet {...qrScannerProps} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
});
