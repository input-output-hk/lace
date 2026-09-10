import React, { useCallback } from 'react';
import { StyleSheet } from 'react-native';

import { spacing, useTheme } from '../../../design-tokens';
import { Button, Card, Column, Icon, Row, Text } from '../../atoms';
import { isWeb } from '../../util';

import type { IconName } from '../../atoms';

export type EarnRewardsCardProps = {
  /** Primary message — the reward, e.g. "Earn rewards on your ADA". */
  title: string;
  /**
   * Supporting benefit line: why the user should feel good taking this action
   * (e.g. it sustains a free, open-source, audited Lace).
   */
  description: string;
  /**
   * Fine print — what actually happens under the hood (delegating stake to the
   * recommended pool and voting power to the recommended DRep, and that it can
   * be changed). Rendered smallest/quietest so the reward stays primary.
   */
  finePrint?: string;
  /** Primary call-to-action label, e.g. "Start earning". */
  ctaLabel: string;
  onPress: () => void;
  /**
   * Optional pre-formatted estimated return line (e.g. "~3.1% estimated APY").
   * The caller formats it — the card only lays it out.
   */
  estimatedReturn?: string;
  /** Icon shown in the leading badge. Defaults to the rewards glyph. */
  iconName?: IconName;
  testID?: string;
};

/**
 * Portfolio nudge inviting a first-time delegator into the one-tap earn-rewards
 * flow. Presentational only: all copy (including the estimated return) arrives
 * as props so the same card renders in any locale and against any configured
 * pool/DRep target.
 */
export const EarnRewardsCard = ({
  title,
  description,
  finePrint,
  ctaLabel,
  onPress,
  estimatedReturn,
  iconName = 'Coins',
  testID = 'earn-rewards-card',
}: EarnRewardsCardProps) => {
  const { theme } = useTheme();

  const handlePress = useCallback(() => {
    onPress();
  }, [onPress]);

  return (
    <Card
      testID={testID}
      blur={!isWeb}
      cardStyle={[styles.card, { backgroundColor: theme.background.primary }]}>
      <Column gap={spacing.M}>
        <Row alignItems="center" gap={spacing.S}>
          <Row
            style={[
              styles.iconBadge,
              { backgroundColor: theme.background.secondary },
            ]}
            alignItems="center"
            justifyContent="center">
            <Icon name={iconName} size={20} color={theme.data.positive} />
          </Row>
          <Column style={styles.headings} gap={spacing.XS}>
            <Text.L testID={`${testID}-title`} numberOfLines={2}>
              {title}
            </Text.L>
            {estimatedReturn !== undefined && (
              <Text.S variant="secondary" testID={`${testID}-estimated-return`}>
                {estimatedReturn}
              </Text.S>
            )}
          </Column>
        </Row>

        <Text.M variant="secondary" testID={`${testID}-description`}>
          {description}
        </Text.M>

        <Button.Primary
          label={ctaLabel}
          onPress={handlePress}
          fullWidth
          testID={`${testID}-cta`}
        />

        {finePrint !== undefined && (
          <Text.XS variant="tertiary" testID={`${testID}-fine-print`}>
            {finePrint}
          </Text.XS>
        )}
      </Column>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: spacing.M,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 100,
    overflow: 'hidden',
  },
  headings: {
    flex: 1,
  },
});
