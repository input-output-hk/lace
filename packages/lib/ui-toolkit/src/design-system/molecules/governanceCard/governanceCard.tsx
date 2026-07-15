import { useTranslation } from '@lace-contract/i18n';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { radius, spacing, useTheme, type Theme } from '../../../design-tokens';
import { getShadowStyle } from '../../../design-tokens/tokens/shadows';
import {
  Avatar,
  Button,
  Card,
  Column,
  Icon,
  Row,
  Shimmer,
  Text,
} from '../../atoms';
import { hexToRgba } from '../../util';

import type { BlockchainName } from '@lace-lib/util-store';

export type GovernanceCardState =
  | 'delegated'
  | 'drep-problem'
  | 'empty-account'
  | 'loading'
  | 'not-delegated';

export type GovernanceCardProps = {
  avatarImage: { uri: string };
  accountName: string;
  accountType: string;
  isShielded: boolean;
  blockchain: BlockchainName;
  state: GovernanceCardState;
  /** Pre-formatted voting power, e.g. "1,234.56". */
  votingPower?: string;
  /** Ticker, e.g. "ADA" / "tADA". */
  coin?: string;
  /** Resolved DRep name, truncated id, or Abstain/No-confidence label. */
  drepLabel?: string;
  /** Truncated DRep id, shown under the name when the name is resolved. */
  drepDisplayId?: string;
  /** CIP-119 avatar; the User icon renders when absent or failing to load. */
  drepAvatarUri?: string;
  /** Pre-formatted DRep voting power, e.g. "₳ 445,219.15". */
  drepVotingPower?: string;
  onDelegate?: () => void;
  onAddFunds?: () => void;
  onUpdateDelegation?: () => void;
  testID?: string;
};

export const GovernanceCard = ({
  avatarImage,
  accountName,
  accountType,
  isShielded,
  blockchain,
  state,
  votingPower,
  coin = 'ADA',
  drepLabel,
  drepDisplayId,
  drepAvatarUri,
  drepVotingPower,
  onDelegate,
  onAddFunds,
  onUpdateDelegation,
  testID = 'governance-card',
}: GovernanceCardProps) => {
  const { theme, layoutSize } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const { t } = useTranslation();
  const hasDRepRow = state === 'delegated' || state === 'drep-problem';
  // On the smallest layout the DRep info stacks under the voting power as its
  // own row; on wider layouts it sits in a column to the right.
  const isCompact = layoutSize === 'compact';

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

  const renderLoadingBalance = () => (
    <Row
      testID={`${testID}-loading-balance`}
      justifyContent="space-between"
      alignItems="center">
      <View>
        <Shimmer.XS width="short" />
        <Shimmer.L width="medium" />
      </View>
    </Row>
  );

  const renderVotingPower = () => (
    <Row
      testID={`${testID}-voting-power`}
      alignItems="center"
      justifyContent="space-between"
      gap={spacing.M}>
      <Column style={styles.balanceContainer} gap={spacing.S}>
        <Text.XS variant="secondary" testID={`${testID}-voting-power-label`}>
          {t('v2.governance.card.voting-power')}
        </Text.XS>
        <Row alignItems="center" gap={spacing.XS}>
          <Text.L testID={`${testID}-voting-power-amount`}>
            {votingPower}
          </Text.L>
          <Text.XS variant="secondary" testID={`${testID}-voting-power-ticker`}>
            {coin}
          </Text.XS>
        </Row>
        {state === 'not-delegated' && (
          <Button.Primary
            flex={1}
            testID={`${testID}-delegate-button`}
            label={t('v2.governance.card.button.delegate')}
            size="large"
            onPress={onDelegate ?? (() => {})}
          />
        )}
        {state === 'empty-account' && onAddFunds && (
          <Button.Primary
            flex={1}
            testID={`${testID}-add-funds-button`}
            label={t('v2.generic.staking.card.add-funds')}
            size="large"
            onPress={onAddFunds}
          />
        )}
      </Column>
      {hasDRepRow && !isCompact && (
        <Column style={styles.drepColumn} gap={spacing.S}>
          <Text.XS variant="secondary" testID={`${testID}-drep-label`}>
            {t('v2.governance.card.drep-id')}
          </Text.XS>
          {renderDRepDetails()}
        </Column>
      )}
    </Row>
  );

  const renderDRepDetails = () => (
    <Row alignItems="center" gap={spacing.S}>
      <Avatar
        size={38}
        shape="rounded"
        content={{
          ...(drepAvatarUri !== undefined && { img: { uri: drepAvatarUri } }),
        }}
        fallbackIcon="User"
        testID={`${testID}-drep-avatar`}
      />
      <Column style={styles.drepDetails} gap={spacing.XS}>
        <Text.S
          style={[
            styles.drepName,
            state === 'drep-problem' && { color: theme.data.negative },
          ]}
          numberOfLines={1}
          ellipsizeMode="middle"
          testID={`${testID}-drep-name`}>
          {drepLabel}
        </Text.S>
        {drepDisplayId !== undefined && (
          <Text.XS
            variant="secondary"
            numberOfLines={1}
            testID={`${testID}-drep-id-value`}>
            {drepDisplayId}
          </Text.XS>
        )}
        {drepVotingPower !== undefined && (
          <Text.XS variant="secondary" testID={`${testID}-drep-voting-power`}>
            {drepVotingPower}
          </Text.XS>
        )}
      </Column>
    </Row>
  );

  const renderDRepInfo = () => {
    if (!hasDRepRow || !isCompact) return null;

    return (
      <Column testID={`${testID}-drep-info`} gap={spacing.S}>
        <Text.XS variant="secondary" testID={`${testID}-drep-label`}>
          {t('v2.governance.card.drep-id')}
        </Text.XS>
        {renderDRepDetails()}
      </Column>
    );
  };

  const renderActionButton = () => {
    if (state === 'drep-problem') {
      return (
        <Button.Primary
          label={t('v2.governance.card.button.update')}
          size="large"
          onPress={onUpdateDelegation ?? (() => {})}
          fullWidth
          testID={`${testID}-update-button`}
        />
      );
    }
    if (state === 'delegated') {
      return (
        <Button.Primary
          label={t('v2.governance.card.button.change-delegation')}
          size="large"
          onPress={onUpdateDelegation ?? (() => {})}
          fullWidth
          testID={`${testID}-change-delegation-button`}
        />
      );
    }
    return null;
  };

  const renderWarning = () => {
    if (state !== 'drep-problem') return null;

    return (
      <Row alignItems="center" style={styles.warningContainer}>
        <Icon name="AlertTriangle" size={20} color={theme.data.negative} />
        <Text.XS style={styles.warningText} testID={`${testID}-warning`}>
          {t('v2.governance.card.warning.drep-problem')}
        </Text.XS>
      </Row>
    );
  };

  return (
    <View style={styles.shadowWrapper}>
      <Card testID={testID} cardStyle={styles.card}>
        {renderHeader()}
        <View style={styles.divider} />
        {state === 'loading' ? renderLoadingBalance() : renderVotingPower()}
        {hasDRepRow && isCompact && <View style={styles.divider} />}
        {renderDRepInfo()}
        {renderActionButton()}
        {renderWarning()}
      </Card>
    </View>
  );
};

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    shadowWrapper: {
      borderRadius: radius.M,
      ...getShadowStyle({ theme, variant: 'card' }),
    },
    card: {
      borderRadius: radius.M,
      padding: spacing.M,
      backgroundColor: theme.background.primary,
    },
    balanceContainer: {
      flex: 1,
    },
    drepColumn: {
      flex: 1,
    },
    drepDetails: {
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
    drepName: {
      flexShrink: 1,
      marginLeft: spacing.S,
      color: theme.text.primary,
    },
    warningContainer: {
      marginTop: spacing.S,
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
