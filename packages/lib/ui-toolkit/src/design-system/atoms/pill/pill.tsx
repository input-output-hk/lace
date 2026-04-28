import { useTranslation } from '@lace-contract/i18n';
import noop from 'lodash/noop';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { useTheme, radius, spacing } from '../../../design-tokens';
import { BlurView } from '../blur-view/blur-view';
import { Icon } from '../icons/Icon';
import { Text } from '../text/text';

import type { Theme } from '../../../design-tokens';

type SyncStatus = 'error' | 'synced' | 'syncing';
type Network = 'mainnet' | 'testnet';

interface PillProps {
  label?: string | null;
  progress?: number | null;
  onPress?: () => void;
  leftNode?: React.ReactNode | null;
  centerNode?: React.ReactNode | null;
  rightNode?: React.ReactNode | null;
  testID?: string;
}

interface SyncStatusProps {
  status: SyncStatus;
  syncingProgress?: number;
  showBeacon?: boolean;
  showLabel?: boolean;
  onPress?: () => void;
}

interface NetworkProps {
  network: Network;
  showLabel?: boolean;
  showIcon?: boolean;
  onPress?: () => void;
}

const PillBase: React.FC<PillProps> = ({
  label,
  onPress = noop,
  leftNode,
  centerNode,
  rightNode,
  testID,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles({ theme }), [theme]);

  return (
    <Pressable style={styles.baseContainer} onPress={onPress} testID={testID}>
      <BlurView style={styles.blur} />
      {!!leftNode && leftNode}
      {(!!label || !!centerNode) && (
        <View>
          {!!label && (
            <Text.XS testID={testID ? `${testID}-label` : 'pill-label'}>
              {label}
            </Text.XS>
          )}
          {!!centerNode && centerNode}
        </View>
      )}
      {!!rightNode && rightNode}
    </Pressable>
  );
};

const SyncStatusVariant: React.FC<SyncStatusProps> = ({
  status,
  onPress,
  syncingProgress = 0,
  showBeacon = true,
  showLabel = true,
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => getStyles({ theme }), [theme]);

  const beaconColor = useMemo(() => {
    switch (status) {
      case 'synced':
        return theme.background.positive;
      case 'syncing':
        return theme.brand.yellowSecondary;
      case 'error':
        return theme.background.negative;
    }
  }, [status, theme]);

  const beacon = useMemo(() => {
    if (!showBeacon) return null;
    const style: ViewStyle = {
      ...styles.beacon,
      backgroundColor: beaconColor,
    };
    return <View style={style} testID="sync-status-beacon" />;
  }, [showBeacon, beaconColor]);

  const progressBar = useMemo(() => {
    // Added this to prevent showing the progress bar until we can calculate the progress
    if (status !== 'syncing' || syncingProgress <= 0) return null;
    const style: ViewStyle = {
      ...styles.syncingBar,
      backgroundColor: theme.brand.yellowSecondary,
      width: `${syncingProgress}%`,
    };
    return (
      <View style={styles.syncingBarWrapper}>
        <View style={style} />
      </View>
    );
  }, [syncingProgress, theme, status]);

  const errorLabel = useMemo(() => {
    if (status !== 'error') return null;
    return (
      <Text.XS
        variant="secondary"
        style={styles.errorText}
        testID="sync-status-error">
        {t('v2.sync-status.error.subtitle')}
      </Text.XS>
    );
  }, [status, t, styles.errorText]);

  const label = useMemo(() => {
    if (!showLabel) return null;
    switch (status) {
      case 'synced':
        return t('v2.sync-status.synced');
      case 'syncing': {
        const syncingLabel = t('v2.sync-status.syncing');
        return syncingProgress > 0
          ? `${String(syncingLabel)} (${Math.round(syncingProgress)}%)`
          : syncingLabel;
      }
      case 'error':
        return t('v2.sync-status.error');
    }
  }, [status, t, syncingProgress]);

  return (
    <PillBase
      onPress={onPress}
      label={label}
      leftNode={beacon}
      centerNode={!showLabel ? null : progressBar || errorLabel}
      testID="sync-status-pill"
    />
  );
};

const NetworkVariant: React.FC<NetworkProps> = ({
  network,
  onPress,
  showLabel = true,
  showIcon = true,
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => getStyles({ theme }), [theme]);

  const label = useMemo(() => {
    if (!showLabel) return null;
    switch (network) {
      case 'mainnet':
        return t('v2.network-status.mainnet');
      case 'testnet':
        return t('v2.network-status.testnet');
    }
  }, [t, network]);

  const icon = useMemo(() => {
    if (!showIcon) return null;
    return (
      <View style={styles.iconContainer} testID="plug-icon">
        <Icon name="PlugSocket" size={12} />
      </View>
    );
  }, [showIcon, styles.iconContainer]);

  return <PillBase onPress={onPress} label={label} leftNode={icon} />;
};

const getStyles = ({ theme }: { theme: Theme }) =>
  StyleSheet.create({
    baseContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      height: 40,
      gap: spacing.S,
      paddingHorizontal: spacing.S,
      borderRadius: radius.L,
      backgroundColor: theme.background.primary,
      overflow: 'hidden',
    },
    blur: { ...StyleSheet.absoluteFillObject, borderRadius: radius.L },
    beacon: {
      width: 12,
      height: 12,
      borderRadius: radius.rounded,
    },
    syncingBarWrapper: {
      height: 5,
      borderRadius: radius.M,
      width: '100%',
      backgroundColor: theme.background.secondary,
      marginTop: spacing.XS,
    },
    syncingBar: {
      height: '100%',
      borderRadius: radius.M,
    },
    iconContainer: {
      backgroundColor: theme.background.secondary,
      borderRadius: radius.rounded,
      padding: spacing.XS,
    },
    errorText: {
      top: -4,
    },
  });

export const Pill = Object.assign(PillBase, {
  Network: NetworkVariant,
  SyncStatus: SyncStatusVariant,
});

export type { SyncStatus, Network };
