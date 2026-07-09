import { useTranslation } from '@lace-contract/i18n';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme, radius } from '../../../design-tokens';
import { Pill } from '../pill/pill';

import type { Theme } from '../../../design-tokens';

export interface OfflineIndicatorProps {
  visible: boolean;
  onPress?: () => void;
  testID?: string;
}

const BEACON_SIZE = 12;

export const OfflineIndicator = ({
  visible,
  onPress,
  testID = 'offline-indicator',
}: OfflineIndicatorProps) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => getStyles({ theme }), [theme]);

  if (!visible) return null;

  const beacon = <View style={styles.beacon} testID={`${testID}-beacon`} />;

  return (
    <Pill
      testID={testID}
      label={t('v2.online-status.offline')}
      leftNode={beacon}
      onPress={onPress}
    />
  );
};

const getStyles = ({ theme }: { theme: Theme }) =>
  StyleSheet.create({
    beacon: {
      width: BEACON_SIZE,
      height: BEACON_SIZE,
      borderRadius: radius.rounded,
      backgroundColor: theme.background.negative,
    },
  });
