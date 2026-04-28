import { useTranslation } from '@lace-contract/i18n';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { radius, spacing, useTheme, type Theme } from '../../../design-tokens';
import { getShadowStyle } from '../../../design-tokens/tokens/shadows';
import {
  Avatar,
  Button,
  Card,
  Icon,
  Text,
  Shimmer,
  Row,
  Column,
} from '../../atoms';
import {
  getAndroidRipple,
  hexToRgba,
  isWeb,
  getEarnedRewards,
} from '../../util';

import type { BlockchainName } from '@lace-lib/util-store';

type StakeCardState =
  | 'empty-account'
  | 'high-saturation'
  | 'loading'
  | 'locked'
  | 'low-saturation'
  | 'not-available'
  | 'pledge'
  | 'retiring'
  | 'stake-available';

type PoolStatus = 'active' | 'locked' | 'saturated';

const stakedStates = new Set<StakeCardState>([
  'high-saturation',
  'low-saturation',
  'locked',
  'pledge',
  'retiring',
]);

export type StakeCardProps = {
  // Basic info
  avatarImage: { uri: string };
  accountName: string;
  accountType: string;
  isShielded: boolean;
  blockchain: BlockchainName;

  // Card state
  state: StakeCardState;

  // Balance data
  balanceCoin?: string;
  coin?: string;

  // Staking data (for staked state)
  earnedCoin?: string;
  stakedCoin?: string;
  poolName?: string;

  // Pool status
  poolStatus?: PoolStatus;

  // Actions
  onStake?: () => void;
  onUpdateDelegation?: () => void;
  onDelegate?: () => void;
  onAddFunds?: () => void;
  testID?: string;
  onViewDelegation?: () => void;
};

export const StakeCard = ({
  avatarImage,
  accountName,
  accountType,
  isShielded,
  blockchain,
  state,
  balanceCoin,
  coin = 'ADA',
  earnedCoin,
  stakedCoin,
  poolName = 'IOG',
  poolStatus,
  onStake,
  onUpdateDelegation,
  onDelegate,
  onAddFunds,
  testID = 'stake-card',
  onViewDelegation,
}: StakeCardProps) => {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const { t } = useTranslation();
  const hasEarnedRewards = useMemo(() => {
    if (!earnedCoin) return false;

    return getEarnedRewards(earnedCoin);
  }, [earnedCoin]);
  const isPressableDisabled = !onViewDelegation;
  const [isHovered, setIsHovered] = useState(false);

  const androidRipple = useMemo(() => {
    return getAndroidRipple({ isDisabled: isPressableDisabled, theme });
  }, [isPressableDisabled, theme]);

  const pressableStyle = useCallback(
    ({ pressed }: { pressed: boolean }) => {
      if (isPressableDisabled) return styles.pressable;

      if (isWeb) {
        if (pressed || isHovered)
          return [styles.pressable, styles.webInteractive];
        return styles.pressable;
      }

      if (pressed) return [styles.pressable, styles.pressedMobile];
      return styles.pressable;
    },
    [isHovered, isPressableDisabled, styles],
  );

  const handleHoverIn = useCallback(() => {
    if (!isPressableDisabled) setIsHovered(true);
  }, [isPressableDisabled]);

  const handleHoverOut = useCallback(() => {
    setIsHovered(false);
  }, []);

  const getWarningMessage = (): string => {
    switch (state) {
      case 'empty-account':
      case 'loading':
      case 'low-saturation':
      case 'not-available':
      case 'stake-available':
        return '';
      case 'high-saturation':
        return t('v2.generic.staking.card.warning.high-saturation');
      case 'pledge':
        return t('v2.generic.staking.card.warning.pledge-not-met');
      case 'locked':
        return t('v2.generic.staking.card.warning.locked-rewards');
      case 'retiring':
        return t('v2.generic.staking.card.warning.retiring');
    }
  };

  const renderHeader = () => {
    if (state === 'loading') {
      return (
        <Row
          testID={`${testID}-header-loading`}
          alignItems="center"
          justifyContent="space-between">
          <View style={styles.headerInfo}>
            <Shimmer.XS width="long" style={styles.labelRow} />
            <Shimmer.XS width="medium" style={styles.labelRow} />
          </View>
        </Row>
      );
    }

    return (
      <Row alignItems="center" justifyContent="space-between">
        <Avatar
          size={38}
          shape="rounded"
          content={{ img: avatarImage, fallback: accountName }}
          style={styles.avatar}
          testID={`${testID}-avatar`}
        />
        <View style={styles.headerInfo}>
          <Row alignItems="center" gap={spacing.XS}>
            <Icon name={blockchain} size={12} variant="solid" />
            <Text.S testID={`${testID}-account-name`}>{accountName}</Text.S>
          </Row>
          <Row alignItems="center" gap={spacing.XS}>
            {isShielded && <Icon name="Shield" size={12} variant="solid" />}
            <Text.XS variant="secondary" testID={`${testID}-account-type`}>
              {accountType}
            </Text.XS>
          </Row>
        </View>
        <Icon name={blockchain} size={24} />
      </Row>
    );
  };

  const renderUnstakedBalance = () => {
    const ButtonComponent =
      state === 'empty-account' || state === 'stake-available'
        ? Button.Primary
        : Button.Secondary;

    const getButtonPress = () => {
      switch (state) {
        case 'empty-account':
          return onAddFunds || (() => {});
        case 'stake-available':
        case 'not-available':
        case 'loading':
        case 'high-saturation':
        case 'low-saturation':
        case 'locked':
        case 'pledge':
        case 'retiring':
        default:
          return onStake || (() => {});
      }
    };

    const isButtonDisabled = state === 'not-available' || state === 'loading';

    return (
      <Row
        testID={`${testID}-unstaked-balance`}
        alignItems="center"
        justifyContent="space-between"
        gap={spacing.M}>
        <Column style={styles.balanceContainer} gap={spacing.S}>
          <Text.XS variant="secondary" testID={`${testID}-total-balance-label`}>
            {t('v2.token-detail.totalBalance')}
          </Text.XS>
          <Row
            testID={`${testID}-balance-coin`}
            alignItems="center"
            gap={spacing.XS}>
            <Text.L testID={`${testID}-total-balance-amount`}>
              {balanceCoin}
            </Text.L>
            <Text.XS
              variant="secondary"
              testID={`${testID}-total-balance-ticker`}>
              {coin}
            </Text.XS>
          </Row>
          {!(state === 'empty-account' && !onAddFunds) && (
            <ButtonComponent
              flex={1}
              testID={`${testID}-stake-button`}
              label={renderCTALabel()}
              size="large"
              onPress={getButtonPress()}
              disabled={isButtonDisabled}
            />
          )}
        </Column>
      </Row>
    );
  };

  const renderStakedBalance = () => (
    <Row
      testID={`${testID}-staked-balance`}
      justifyContent="space-between"
      alignItems="center"
      gap={spacing.M}>
      <View>
        <Row alignItems="center" gap={spacing.XS}>
          <Text.XS variant="secondary" testID={`${testID}-earned-coin-label`}>
            {t('v2.generic.staking.card.earned')}
          </Text.XS>
        </Row>
        <Row
          testID={`${testID}-earned-coin`}
          alignItems="center"
          gap={spacing.XS}>
          <Text.L
            style={hasEarnedRewards ? styles.earnedAmount : undefined}
            testID={`${testID}-earned-coin-amount`}>
            {earnedCoin}
          </Text.L>
          <Text.XS
            style={hasEarnedRewards ? styles.earnedTicker : undefined}
            testID={`${testID}-earned-coin-ticker`}>
            {coin}
          </Text.XS>
        </Row>
      </View>
      <View>
        <Text.XS variant="secondary" testID={`${testID}-staked-coin-label`}>
          {t('v2.generic.staking.card.staked')}
        </Text.XS>
        <Row
          testID={`${testID}-staked-coin`}
          alignItems="center"
          gap={spacing.XS}>
          <Text.L testID={`${testID}-staked-coin-amount`}>{stakedCoin}</Text.L>
          <Text.XS variant="secondary" testID={`${testID}-staked-coin-ticker`}>
            {coin}
          </Text.XS>
        </Row>
      </View>
    </Row>
  );

  const renderLoadingBalance = () => (
    <Row
      testID={`${testID}-loading-balance`}
      justifyContent="space-between"
      alignItems="center">
      <View>
        <Shimmer.XS width="short" />
        <Shimmer.L width="medium" />
      </View>
      <View>
        <Shimmer.XS width="short" />
        <Shimmer.L width="medium" />
      </View>
    </Row>
  );

  const renderBalance = () => {
    switch (state) {
      case 'loading':
        return renderLoadingBalance();
      case 'stake-available':
      case 'empty-account':
      case 'not-available':
        return renderUnstakedBalance();
      case 'high-saturation':
      case 'low-saturation':
      case 'locked':
      case 'pledge':
      case 'retiring':
        return renderStakedBalance();
      default:
        return renderUnstakedBalance();
    }
  };

  const renderCTALabel = () => {
    switch (state) {
      case 'empty-account':
        return t('v2.generic.staking.card.add-funds');
      case 'loading':
      case 'not-available':
        return t('v2.generic.staking.card.coming-soon');
      case 'stake-available':
        return t('v2.generic.staking.card.stake.label');
      case 'high-saturation':
      case 'low-saturation':
      case 'pledge':
      case 'retiring':
        return t('v2.generic.staking.card.update.stake');
      case 'locked':
        return t('v2.generic.staking.card.locked');
    }
  };

  const renderActionButton = () => {
    switch (state) {
      case 'stake-available':
      case 'empty-account':
      case 'not-available':
      case 'low-saturation':
        // These states already have buttons in renderUnstakedBalance()
        return null;
      case 'high-saturation':
      case 'pledge':
      case 'retiring':
        return (
          <Button.Primary
            label={t('v2.generic.staking.card.update.stake')}
            size="large"
            onPress={onUpdateDelegation || (() => {})}
            fullWidth
          />
        );
      case 'locked':
        return (
          <Button.Primary
            label={t('v2.generic.staking.card.locked')}
            size="large"
            onPress={onDelegate || (() => {})}
            fullWidth
          />
        );
      case 'loading':
      case 'low-saturation':
      default:
        return null;
    }
  };

  const getPoolNameColor = (status: PoolStatus): string => {
    switch (status) {
      case 'active':
        return theme.text.primary;
      case 'locked':
      case 'saturated':
        return theme.data.negative;
      default:
        return theme.text.primary;
    }
  };

  const renderPoolInfo = () => {
    if (state === 'loading' || !isStakedState()) {
      return null;
    }

    return (
      <Row
        testID={`${testID}-pool-info`}
        alignItems="center"
        justifyContent="space-between">
        <Text.M variant="secondary" testID={`${testID}-pool-label`}>
          {t('v2.generic.staking.card.label.pool')}
        </Text.M>
        <Text.M
          style={[
            styles.poolName,
            { color: getPoolNameColor(poolStatus || 'active') },
          ]}
          testID={`${testID}-pool-name`}>
          {poolName}
        </Text.M>
      </Row>
    );
  };

  const isStakedState = () => stakedStates.has(state);

  const renderWarning = () => {
    const warningStates = ['high-saturation', 'locked', 'retiring'] as const;
    const isPledgeState = state === 'pledge';

    if (warningStates.includes(state as (typeof warningStates)[number])) {
      return (
        <Row alignItems="center" style={styles.warningContainer}>
          <Icon name="AlertTriangle" size={20} color={theme.data.negative} />
          <Text.XS style={styles.warningText}>{getWarningMessage()}</Text.XS>
        </Row>
      );
    }

    if (isPledgeState) {
      return (
        <Row style={styles.warningContainer}>
          <Icon name="AlertTriangle" size={20} color={theme.brand.yellow} />
          <Text.XS style={[styles.warningText, { color: theme.brand.yellow }]}>
            {getWarningMessage()}
          </Text.XS>
        </Row>
      );
    }

    return null;
  };

  return (
    <Pressable
      onPress={onViewDelegation}
      disabled={isPressableDisabled}
      style={pressableStyle}
      onHoverIn={handleHoverIn}
      onHoverOut={handleHoverOut}
      android_ripple={androidRipple}>
      <Card testID={testID} cardStyle={styles.card}>
        {renderHeader()}
        <View style={styles.divider} />
        {renderBalance()}
        {isStakedState() && <View style={styles.divider} />}
        {isStakedState() && renderPoolInfo()}
        {renderActionButton()}
        {renderWarning()}
      </Card>
    </Pressable>
  );
};

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    pressable: {
      overflow: 'hidden',
      borderRadius: radius.M,
    },
    webInteractive: isWeb ? getShadowStyle({ theme, variant: 'inset' }) : {},
    pressedMobile: {
      opacity: 0.8,
      transform: [{ scale: 0.99 }],
    },
    card: {
      borderRadius: radius.M,
      padding: spacing.M,
      backgroundColor: theme.background.primary,
    },
    balanceContainer: {
      flex: 1,
    },
    avatar: {
      marginRight: spacing.S,
    },
    headerInfo: {
      flex: 1,
      alignItems: 'flex-start',
      marginRight: spacing.S,
    },
    labelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.XS,
    },
    divider: {
      height: 1,
      backgroundColor: theme.background.tertiary,
      width: '100%',
      marginVertical: spacing.S,
    },
    earnedAmount: {
      color: theme.data.positive,
    },
    earnedTicker: {
      color: theme.data.positive,
    },
    poolName: {
      color: theme.brand.ascending,
    },
    warningContainer: {
      marginBottom: spacing.XS,
      padding: spacing.S,
      borderRadius: radius.S,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: hexToRgba(theme.data.negative, 0.3),
      backgroundColor: hexToRgba(theme.data.negative, 0.12),
    },
    warningText: {
      color: theme.text.primary,
      flex: 1,
      marginLeft: spacing.S,
    },
  });
